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

package opus

import (
	"errors"
	"fmt"
	"io"
	"time"

	"gopkg.in/hraban/opus.v2"

	"github.com/livekit/protocol/logger"

	"github.com/livekit/media-sdk"
	"github.com/livekit/media-sdk/rtp"
	"github.com/livekit/media-sdk/webm"
)

/*
#cgo pkg-config: opus
#include <opus.h>
*/
import "C"

type Sample []byte

func (s Sample) Size() int {
	return len(s)
}

func (s Sample) CopyTo(dst []byte) (int, error) {
	if len(dst) < len(s) {
		return 0, io.ErrShortBuffer
	}
	n := copy(dst, s)
	return n, nil
}

type Writer = media.WriteCloser[Sample]

func Decode(w media.PCM16Writer, targetChannels int, logger logger.Logger) (Writer, error) {
	if targetChannels != 1 && targetChannels != 2 {
		return nil, fmt.Errorf("opus decoder only supports mono or stereo output")
	}

	return &decoder{
		w:              w,
		targetChannels: targetChannels,
		lastChannels:   targetChannels,
		logger:         logger,
	}, nil
}

func Encode(w Writer, channels int, logger logger.Logger) (media.PCM16Writer, error) {
	enc, err := opus.NewEncoder(w.SampleRate(), channels, opus.AppVoIP)
	if err != nil {
		return nil, err
	}
	return &encoder{
		w:      w,
		enc:    enc,
		buf:    make([]byte, w.SampleRate()/rtp.DefFramesPerSec*channels),
		logger: logger,
	}, nil
}

type decoder struct {
	w      media.PCM16Writer
	dec    *opus.Decoder
	buf    media.PCM16Sample
	buf2   media.PCM16Sample
	logger logger.Logger

	targetChannels int
	lastChannels   int

	successiveErrorCount int
}

func (d *decoder) String() string {
	return fmt.Sprintf("OPUS(decode) -> %s", d.w)
}

func (d *decoder) SampleRate() int {
	return d.w.SampleRate()
}

func (d *decoder) WriteSample(in Sample) error {
	if len(in) == 0 {
		return nil
	}
	channels, err := d.resetForSample(in)
	if err != nil {
		return err
	}

	n, err := d.dec.Decode(in, d.buf)
	if err != nil {
		// Some workflows (concatenating opus files) can cause a suprious decoding error, so ignore small amount of corruption errors
		if !errors.Is(err, opus.ErrInvalidPacket) || d.successiveErrorCount >= 5 {
			return err
		}
		d.logger.Debugw("opus decoder failed decoding a sample")
		d.successiveErrorCount++
		return nil
	}
	d.successiveErrorCount = 0

	returnData := d.buf[:n*channels]
	if channels < d.targetChannels {
		n2 := len(returnData) * 2
		if len(d.buf2) < n2 {
			d.buf2 = make(media.PCM16Sample, n2)
		}
		media.MonoToStereo(d.buf2, returnData)
		returnData = d.buf2[:n2]
	} else if channels > d.targetChannels {
		n2 := len(returnData) / 2
		if len(d.buf2) < n2 {
			d.buf2 = make(media.PCM16Sample, n2)
		}
		media.StereoToMono(d.buf2, returnData)
		returnData = d.buf2[:n2]
	}

	return d.w.WriteSample(returnData)
}

func (d *decoder) resetForSample(in Sample) (int, error) {
	channels := int(C.opus_packet_get_nb_channels((*C.uchar)(&in[0])))

	if d.dec == nil || d.lastChannels != channels {
		dec, err := opus.NewDecoder(d.w.SampleRate(), channels)
		if err != nil {
			d.logger.Errorw("opus decoder failed to reset", err)
			return 0, err
		}
		d.dec = dec

		d.buf = make([]int16, d.w.SampleRate()/rtp.DefFramesPerSec*channels)
		d.lastChannels = channels
	}

	return channels, nil
}

func (d *decoder) Close() error {
	return d.w.Close()
}

type encoder struct {
	w      Writer
	enc    *opus.Encoder
	buf    Sample
	logger logger.Logger
}

func (e *encoder) String() string {
	return fmt.Sprintf("OPUS(encode) -> %s", e.w)
}

func (e *encoder) SampleRate() int {
	return e.w.SampleRate()
}

func (e *encoder) WriteSample(in media.PCM16Sample) error {
	n, err := e.enc.Encode(in, e.buf)
	if err != nil {
		return err
	}
	return e.w.WriteSample(e.buf[:n])
}

func (e *encoder) Close() error {
	return e.w.Close()
}

func NewWebmWriter(w io.WriteCloser, sampleRate int, channels int, sampleDur time.Duration) media.WriteCloser[Sample] {
	return webm.NewWriter[Sample](w, "A_OPUS", channels, sampleRate, sampleDur)
}
