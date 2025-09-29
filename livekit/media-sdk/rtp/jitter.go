// Copyright 2025 LiveKit, Inc.
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
	"time"

	"github.com/pion/rtp"

	"github.com/livekit/media-sdk/jitter"
)

const (
	jitterMaxLatency = 60 * time.Millisecond // should match mixer's target buffer size
)

func HandleJitter(h HandlerCloser) HandlerCloser {
	handler := &jitterHandler{
		h:   h,
		err: make(chan error, 1),
	}
	// Jitter buffer expects to be closed (to stop the timer), but handler interface doesn't allow it.
	// This should be fine, because GC can now collect timers and goroutines blocked on them if they are not referenced.
	handler.buf = jitter.NewBuffer(audioDepacketizer{}, jitterMaxLatency, func(packets []jitter.ExtPacket) {
		for _, p := range packets {
			handler.handleRTP(p.Packet)
		}
	})
	return handler
}

type jitterHandler struct {
	h   HandlerCloser
	buf *jitter.Buffer
	err chan error
}

func (r *jitterHandler) String() string {
	return "Jitter -> " + r.h.String()
}

func (r *jitterHandler) handleRTP(p *rtp.Packet) {
	if err := r.h.HandleRTP(&p.Header, p.Payload); err != nil {
		select {
		case r.err <- err:
			// error pushed
		default:
			// error channel is full, don't block
		}
	}
}

func (r *jitterHandler) HandleRTP(h *rtp.Header, payload []byte) error {
	// This may call handleRTP, possibly multiple times.
	r.buf.Push(&rtp.Packet{Header: *h, Payload: payload})
	select {
	case err := <-r.err:
		return err
	default:
		return nil
	}
}

func (r *jitterHandler) Close() {
	r.buf.Close()
	r.h.Close()
}

type audioDepacketizer struct{}

func (d audioDepacketizer) Unmarshal(packet []byte) ([]byte, error) {
	return packet, nil
}

func (d audioDepacketizer) IsPartitionHead(payload []byte) bool {
	return true
}

func (d audioDepacketizer) IsPartitionTail(marker bool, payload []byte) bool {
	return true
}
