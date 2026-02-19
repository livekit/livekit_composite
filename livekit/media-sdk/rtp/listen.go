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
	"context"
	"errors"
	"fmt"
	"math/rand"
	"net"
	"net/netip"
	"syscall"
)

var ErrListenFailed = errors.New("failed to listen on udp port")

type bindFunc func(port int, ip netip.Addr) (*net.UDPConn, error)

func bindRange(portMin, portMax int, ip netip.Addr, create bindFunc) (*net.UDPConn, error) {
	if portMin <= 0 && portMax <= 0 {
		return create(0, ip)
	} else if portMin == portMax {
		return create(portMin, ip)
	}
	if portMin <= 0 {
		portMin = 1
	}
	if portMax <= 0 || portMax > 0xFFFF {
		portMax = 0xFFFF
	}
	if portMin > portMax {
		return nil, ErrListenFailed
	}

	ports := portMax - portMin + 1
	portCurrent := rand.Intn(ports) + portMin

	for try := 0; try < ports; try++ {
		c, err := create(portCurrent, ip)
		if err == nil {
			return c, nil
		} else if !errors.Is(err, syscall.EADDRINUSE) {
			return c, err
		}
		portCurrent++
		if portCurrent > portMax {
			portCurrent = portMin
		}
	}
	return nil, ErrListenFailed
}

func ListenUDPPortRange(portMin, portMax int, ip netip.Addr) (*net.UDPConn, error) {
	return bindRange(portMin, portMax, ip, func(port int, ip netip.Addr) (*net.UDPConn, error) {
		addr := &net.UDPAddr{IP: ip.AsSlice(), Port: port}
		return net.ListenUDP("udp", addr)
	})
}

func ListenUDPPortRangeWithConfig(portMin, portMax int, ip netip.Addr, lc *net.ListenConfig) (*net.UDPConn, error) {
	ctx := context.Background() // ctx is only used to resolve domain names, which we don't use here.
	ipStr := ip.String()
	return bindRange(portMin, portMax, ip, func(port int, ip netip.Addr) (*net.UDPConn, error) {
		conn, err := lc.ListenPacket(ctx, "udp", fmt.Sprintf("%s:%d", ipStr, port))
		if err != nil {
			return nil, err
		}
		return conn.(*net.UDPConn), nil
	})
}
