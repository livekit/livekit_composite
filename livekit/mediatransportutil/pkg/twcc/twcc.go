// Copyright 2023 LiveKit, Inc.
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

package twcc

import (
	"math/rand"
	"sync"

	piontwcc "github.com/pion/interceptor/pkg/twcc"
	"github.com/pion/rtcp"
)

const (
	tccReportDelta          = 1e8
	tccReportDeltaAfterMark = 50e6
)

// Responder is a lightweight wrapper around pion/interceptor's implementation of TWCC
type Responder struct {
	sync.Mutex

	sSSRC      uint32
	lastReport int64
	recorder   *piontwcc.Recorder

	onFeedback func(packet []rtcp.Packet)
}

func NewTransportWideCCResponder() *Responder {
	sSSRC := rand.Uint32()
	recorder := piontwcc.NewRecorder(sSSRC)
	return &Responder{
		sSSRC:    sSSRC,
		recorder: recorder,
	}
}

// Push a sequence number read from rtp packet ext packet
func (t *Responder) Push(ssrc uint32, sn uint16, timeNS int64, marker bool) {
	t.Lock()
	defer t.Unlock()

	t.recorder.Record(ssrc, sn, timeNS/1000)

	delta := timeNS - t.lastReport
	if t.recorder.PacketsHeld() > 20 &&
		(delta >= tccReportDelta ||
			t.recorder.PacketsHeld() > 100 ||
			(marker && delta >= tccReportDeltaAfterMark)) {
		if pkts := t.recorder.BuildFeedbackPacket(); pkts != nil {
			t.onFeedback(pkts)
		}
		t.lastReport = timeNS
	}
}

// OnFeedback sets the callback for the formed twcc feedback rtcp packet
func (t *Responder) OnFeedback(f func(pkts []rtcp.Packet)) {
	t.onFeedback = f
}
