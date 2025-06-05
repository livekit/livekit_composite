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

package bucket

import "errors"

var (
	ErrNoBucket          = errors.New("no bucket")
	ErrBufferTooSmall    = errors.New("buffer too small")
	ErrPacketTooOld      = errors.New("received packet too old")
	ErrPacketTooNew      = errors.New("received packet too new")
	ErrRTXPacket         = errors.New("packet already received")
	ErrRTXPacketSize     = errors.New("packet already received, size mismatch")
	ErrPacketMismatch    = errors.New("sequence number mismatch")
	ErrPacketSizeInvalid = errors.New("invalid size")
	ErrPacketTooLarge    = errors.New("packet too large")
)
