// Copyright 2025 LiveKit, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package res

import (
	"bytes"
	_ "embed"
	"fmt"
	"io"

	"github.com/jfreymuth/oggvorbis"

	"github.com/livekit/media-sdk"
)

//go:embed enter_pin.ogg
var EnterPinOgg []byte

//go:embed room_join.ogg
var RoomJoinOgg []byte

//go:embed wrong_pin.ogg
var WrongPinOgg []byte

const SampleRate = 48000

func ReadOggAudioFile(data []byte, sampleRate int, channels int) []media.PCM16Sample {
	perFrame := sampleRate / media.DefFramesPerSec
	r, err := oggvorbis.NewReader(bytes.NewReader(data))
	if err != nil {
		panic(err)
	}
	if r.SampleRate() != sampleRate {
		panic(fmt.Sprintf("unexpected sample rate, expected %d, got %d", sampleRate, r.SampleRate()))
	}
	if r.Channels() != channels {
		panic(fmt.Sprintf("unexpected number of channels, expected %d, got %d", channels, r.Channels()))
	}
	// Frames in the source file may be shorter,
	// so we collect all samples and split them to frames again.
	var samples media.PCM16Sample
	buf := make([]float32, perFrame)
	for {
		n, err := r.Read(buf)
		if n != 0 {
			frame := make(media.PCM16Sample, n)
			for i := range frame {
				frame[i] = int16(buf[i] * 0x7fff)
			}
			samples = append(samples, frame...)
		}
		if err == io.EOF {
			break
		} else if err != nil {
			panic(err)
		}
	}
	var frames []media.PCM16Sample
	for len(samples) > 0 {
		cur := samples
		if len(cur) > perFrame {
			cur = cur[:perFrame]
		}
		frames = append(frames, cur)
		samples = samples[len(cur):]
	}
	return frames
}
