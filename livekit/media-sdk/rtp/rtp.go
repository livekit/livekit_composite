// Copyright 2023 LiveKit, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// 	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package rtp

import (
	"fmt"
	"math/rand/v2"
	"slices"
	"sync"
	"sync/atomic"

	"github.com/pion/interceptor"
	"github.com/pion/rtp"

	"github.com/livekit/media-sdk"
)

const rtpStreamTSResetFrames = 25 // 500ms @ ptime=20ms

type BytesFrame interface {
	~[]byte
	media.Frame
}

type Writer interface {
	String() string
	WriteRTP(h *rtp.Header, payload []byte) (int, error)
}

type Reader interface {
	ReadRTP() (*rtp.Packet, interceptor.Attributes, error)
}

type Handler interface {
	String() string
	HandleRTP(h *rtp.Header, payload []byte) error
}

type HandlerCloser interface {
	Handler
	Close()
}

type HandlerFunc func(h *rtp.Header, payload []byte) error

func (fnc HandlerFunc) String() string {
	return "HandlerFunc"
}

func (fnc HandlerFunc) HandleRTP(h *rtp.Header, payload []byte) error {
	if fnc == nil {
		return nil
	}
	return fnc(h, payload)
}

func HandleLoop(r Reader, h HandlerCloser) error {
	defer h.Close()

	for {
		p, _, err := r.ReadRTP()
		if err != nil {
			return err
		}
		err = h.HandleRTP(&p.Header, p.Payload)
		if err != nil {
			return err
		}
	}
}

type nopCloser struct {
	Handler
}

func NewNopCloser(h Handler) HandlerCloser {
	return nopCloser{h}
}

func (nopCloser) Close() {}

// Buffer is a Writer that clones and appends RTP packets into a slice.
type Buffer []*Packet

func (b *Buffer) String() string {
	return "Buffer"
}

func (b *Buffer) WriteRTP(h *rtp.Header, payload []byte) (int, error) {
	*b = append(*b, &rtp.Packet{
		Header:  *h,
		Payload: slices.Clone(payload),
	})
	return len(payload), nil
}

// NewSeqWriter creates an RTP writer that automatically increments the sequence number.
func NewSeqWriter(w Writer) *SeqWriter {
	s := &SeqWriter{w: w}
	s.h = rtp.Header{
		Version:        2,
		SSRC:           rand.Uint32(),
		SequenceNumber: 0,
	}
	return s
}

type Packet = rtp.Packet
type Header = rtp.Header

type Event struct {
	Type      byte
	Timestamp uint32
	Payload   []byte
	Marker    bool
}

type SeqWriter struct {
	maxTS atomic.Uint32
	mu    sync.Mutex
	w     Writer
	h     Header
}

func (s *SeqWriter) String() string {
	return s.w.String()
}

// CurTS requests a timestamp from the stream, using ts as a reference.
// The function may return timestamp as-is or may adjust it to catch up with other active streams.
func (s *SeqWriter) CurTS(ts, inc uint32) uint32 {
	for {
		cur := s.maxTS.Load()
		// TODO: Handle wrap-around. Not a concern for now, because all streams start at TS=0.
		if cur > ts+rtpStreamTSResetFrames*inc {
			// Previous timestamp on the stream was too long ago.
			// Force a timestamp reset to the one from a more recent stream.
			return cur
		}
		if cur >= ts {
			// Timestamp is withing allowed range.
			return ts
		}
		// Adjust the max timestamp, make sure other stream didn't update it before us.
		if s.maxTS.CompareAndSwap(cur, ts) {
			return ts
		}
	}
}

func (s *SeqWriter) WriteEvent(ev *Event) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.h.PayloadType = ev.Type
	s.h.Marker = ev.Marker
	s.h.Timestamp = ev.Timestamp
	if _, err := s.w.WriteRTP(&s.h, ev.Payload); err != nil {
		return err
	}
	s.h.SequenceNumber++
	return nil
}

// NewStream creates a new media stream in RTP and tracks timestamps associated with it.
func (s *SeqWriter) NewStream(typ byte, clockRate int) *Stream {
	return s.NewStreamWithDur(typ, uint32(clockRate/DefFramesPerSec))
}

func (s *SeqWriter) NewStreamWithDur(typ byte, packetDur uint32) *Stream {
	st := &Stream{s: s, packetDur: packetDur}
	st.ev.Type = typ
	return st
}

type Stream struct {
	s         *SeqWriter
	packetDur uint32
	mu        sync.Mutex
	ev        Event
	followup  bool
}

func (s *Stream) writePayload(inc bool, data []byte, marker bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ev.Payload = data
	s.ev.Marker = marker
	if !s.followup {
		s.ev.Timestamp = s.s.CurTS(s.ev.Timestamp, s.packetDur)
	}
	if err := s.s.WriteEvent(&s.ev); err != nil {
		return err
	}
	if inc {
		s.followup = false
		s.ev.Timestamp += s.packetDur
	} else {
		s.followup = true
	}
	return nil
}

// WritePayload writes the payload to RTP and increments the timestamp.
func (s *Stream) WritePayload(data []byte, marker bool) error {
	return s.writePayload(true, data, marker)
}

// WritePayloadAtCurrent writes the payload to RTP at the current timestamp.
// This allows to emit multiple different payloads with the same timestamp in this stream (e.g. DTMF).
// The caller is expected to call Delay or DelayN at some point to advances the timestamp.
func (s *Stream) WritePayloadAtCurrent(data []byte, marker bool) error {
	return s.writePayload(false, data, marker)
}

// Delay advances the timestamp of the next frame. Typically used in combination with WritePayloadAtCurrent.
func (s *Stream) Delay(dur uint32) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ev.Timestamp += dur
	s.ev.Timestamp = s.s.CurTS(s.ev.Timestamp, s.packetDur)
	s.followup = false
}

// DelayN is similar to Delay, but it increments time in multiples of the frame durations.
func (s *Stream) DelayN(n int) {
	if n < 0 {
		panic("rtp: negative delay")
	}
	s.Delay(uint32(n) * s.packetDur)
}

func (s *Stream) ResetTimestamp(ts uint32) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.ev.Timestamp = ts
	s.followup = false
}

func (s *Stream) GetCurrentTimestamp() uint32 {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.ev.Timestamp
}

func NewMediaStreamOut[T BytesFrame](s *Stream, sampleRate int) *MediaStreamOut[T] {
	return &MediaStreamOut[T]{s: s, sampleRate: sampleRate}
}

type MediaStreamOut[T BytesFrame] struct {
	s          *Stream
	sampleRate int
}

func (s *MediaStreamOut[T]) String() string {
	return fmt.Sprintf("RTP(%d)", s.sampleRate)
}

func (s *MediaStreamOut[T]) SampleRate() int {
	return s.sampleRate
}

func (s *MediaStreamOut[T]) Close() error {
	return nil
}

func (s *MediaStreamOut[T]) WriteSample(sample T) error {
	return s.s.WritePayload([]byte(sample), false)
}

func NewMediaStreamIn[T BytesFrame](w media.Writer[T]) *MediaStreamIn[T] {
	return &MediaStreamIn[T]{Writer: w}
}

type MediaStreamIn[T BytesFrame] struct {
	Writer media.Writer[T]
}

func (s *MediaStreamIn[T]) String() string {
	return fmt.Sprintf("RTP(%d) -> %s", s.Writer.SampleRate(), s.Writer)
}

func (s *MediaStreamIn[T]) HandleRTP(_ *rtp.Header, payload []byte) error {
	return s.Writer.WriteSample(T(payload))
}
