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

package media

import (
	"bufio"
	"fmt"
	"io"
	"strings"
	"sync/atomic"
	"time"
)

const (
	// DefFrameDur is a default duration of an audio frame.
	DefFrameDur = 20 * time.Millisecond
	// DefFramesPerSec is a default number of audio frames per second.
	DefFramesPerSec = int(time.Second / DefFrameDur)
)

type Frame interface {
	// Size of the frame in bytes.
	Size() int
	// CopyTo copies the frame content to the destination bytes slice.
	// It returns io.ErrShortBuffer is the buffer size is less than frame's Size.
	CopyTo(dst []byte) (int, error)
}

type Reader[T any] interface {
	ReadSample(buf T) (int, error)
}

type ReadCloser[T any] interface {
	Reader[T]
	Close() error
}

type Writer[T any] interface {
	String() string
	SampleRate() int
	WriteSample(sample T) error
}

type WriteCloser[T any] interface {
	Writer[T]
	Close() error
}

type writeCloser[T any] struct {
	Writer[T]
}

func (*writeCloser[T]) Close() error {
	return nil
}

func NopCloser[T any](w Writer[T]) WriteCloser[T] {
	return &writeCloser[T]{w}
}

func NewSwitchWriter(sampleRate int) *SwitchWriter {
	// This protects from a case when sample rate is not initialized,
	// but still allows passing -1 to delay initialization.
	// If sample rate is still uninitialized when another writer is attached,
	// the SampleRate method will panic instead of this check.
	if sampleRate == 0 {
		panic("no sample rate specified")
	}
	if sampleRate < 0 {
		sampleRate = -1 // checked by SetSampleRate
	}
	w := &SwitchWriter{}
	w.sampleRate.Store(int32(sampleRate))
	return w
}

type SwitchWriter struct {
	ptr        atomic.Pointer[PCM16Writer]
	sampleRate atomic.Int32
	disabled   atomic.Bool
}

func (s *SwitchWriter) Enable() {
	s.disabled.Store(false)
}

func (s *SwitchWriter) Disable() {
	s.disabled.Store(true)
}

func (s *SwitchWriter) Get() PCM16Writer {
	ptr := s.ptr.Load()
	if ptr == nil {
		return nil
	}
	return *ptr
}

// Swap sets an underlying writer and returns the old one.
// Caller is responsible for closing the old writer.
func (s *SwitchWriter) Swap(w PCM16Writer) PCM16Writer {
	var old *PCM16Writer
	if w == nil {
		old = s.ptr.Swap(nil)
	} else {
		if rate := s.SampleRate(); rate != w.SampleRate() {
			w = ResampleWriter(w, rate)
		}
		old = s.ptr.Swap(&w)
	}
	if old == nil {
		return nil
	}
	return *old
}

func (s *SwitchWriter) String() string {
	w := s.Get()
	return fmt.Sprintf("Switch(%d) -> %v", s.sampleRate.Load(), w)
}

// SetSampleRate sets a new sample rate for the switch. For this to work, NewSwitchWriter(-1) must be called.
// The code will panic if sample rate is unset when a writer is attached, or if this method is called twice.
func (s *SwitchWriter) SetSampleRate(rate int) {
	if rate <= 0 {
		panic("invalid sample rate")
	}
	if !s.sampleRate.CompareAndSwap(-1, int32(rate)) {
		panic("sample rate can only be changed once")
	}
}

// SampleRate returns an expected sample rate for this writer. It panics if the sample rate is not specified.
func (s *SwitchWriter) SampleRate() int {
	rate := int(s.sampleRate.Load())
	if rate == 0 {
		panic("switch writer not initialized")
	} else if rate < 0 {
		panic("sample rate is unset on a switch writer")
	}
	return rate
}

func (s *SwitchWriter) Close() error {
	ptr := s.ptr.Swap(nil)
	if ptr == nil {
		return nil
	}
	return (*ptr).Close()
}

func (s *SwitchWriter) WriteSample(sample PCM16Sample) error {
	if s.disabled.Load() {
		return nil
	}
	w := s.Get()
	if w == nil {
		return nil
	}
	return w.WriteSample(sample)
}

type MultiWriter[T any] []WriteCloser[T]

func (s MultiWriter[T]) String() string {
	var buf strings.Builder
	fmt.Fprintf(&buf, "MultiWriter(%d,%d)", len(s), s.SampleRate())
	for i, w := range s {
		fmt.Fprintf(&buf, "; $%d-> %s", i+1, w.String())
	}
	return buf.String()
}

func (s MultiWriter[T]) SampleRate() int {
	if len(s) == 0 {
		return 0
	}
	return s[0].SampleRate()
}

func (s MultiWriter[T]) WriteSample(sample T) error {
	var last error
	for _, w := range s {
		if err := w.WriteSample(sample); err != nil {
			last = err
		}
	}
	return last
}

func (s MultiWriter[T]) Close() error {
	var last error
	for _, w := range s {
		if err := w.Close(); err != nil {
			last = err
		}
	}
	return last
}

func NewFileWriter[T Frame](w io.WriteCloser, sampleRate int) WriteCloser[T] {
	return &fileWriter[T]{
		w:          w,
		bw:         bufio.NewWriter(w),
		sampleRate: sampleRate,
	}
}

type fileWriter[T Frame] struct {
	w          io.WriteCloser
	bw         *bufio.Writer
	sampleRate int
	buf        []byte
}

func (w *fileWriter[T]) String() string {
	return fmt.Sprintf("RawFile(%d)", w.sampleRate)
}

func (w *fileWriter[T]) SampleRate() int {
	return w.sampleRate
}

func (w *fileWriter[T]) WriteSample(sample T) error {
	if sz := sample.Size(); cap(w.buf) < sz {
		w.buf = make([]byte, sz)
	} else {
		w.buf = w.buf[:sz]
	}
	n, err := sample.CopyTo(w.buf)
	if err != nil {
		return err
	}
	_, err = w.bw.Write(w.buf[:n])
	return err
}

func (w *fileWriter[T]) Close() error {
	if err := w.bw.Flush(); err != nil {
		_ = w.w.Close()
		return err
	}
	if err := w.w.Close(); err != nil {
		return err
	}
	return nil
}
