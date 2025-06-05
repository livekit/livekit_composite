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

//go:build !windows
// +build !windows

package rtcconfig

import (
	"net"
	"syscall"

	"github.com/livekit/protocol/logger"
)

func checkUDPReadBuffer() {
	val, err := getUDPReadBuffer()
	if err == nil {
		if val < minUDPBufferSize {
			logger.Warnw("UDP receive buffer is too small for a production set-up", nil,
				"current", val,
				"suggested", minUDPBufferSize)
		} else {
			logger.Debugw("UDP receive buffer size", "current", val)
		}
	}
}

func getUDPReadBuffer() (int, error) {
	conn, err := net.ListenUDP("udp4", nil)
	if err != nil {
		return 0, err
	}
	defer func() { _ = conn.Close() }()
	_ = conn.SetReadBuffer(defaultUDPBufferSize)
	fd, err := conn.File()
	if err != nil {
		return 0, nil
	}
	defer func() { _ = fd.Close() }()

	return syscall.GetsockoptInt(int(fd.Fd()), syscall.SOL_SOCKET, syscall.SO_RCVBUF)
}
