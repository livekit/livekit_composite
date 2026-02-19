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

package transport

import (
	"fmt"
	"net"
	"time"

	"github.com/pion/ice/v4"
	"github.com/pion/logging"
	"github.com/pion/transport/v4"
	"github.com/pion/transport/v4/stdnet"
	tudp "github.com/pion/transport/v4/udp"
)

// Functions to create UDPMuxes from ports, most code are copied from pion/ice package as the PR
// https://github.com/pion/ice/pull/608 is blocked. Once the PR is merged, we can
// remove this file and use the pion/ice package directly.

// CreateUDPMuxesFromPorts creates an slice of UDPMuxes that
// listens to all interfaces on the provided ports.
func CreateUDPMuxesFromPorts(ports []int, opts ...UDPMuxFromPortOption) ([]ice.UDPMux, error) {
	params := multiUDPMuxFromPortParam{
		networks: []ice.NetworkType{ice.NetworkTypeUDP4, ice.NetworkTypeUDP6},
	}
	for _, opt := range opts {
		opt.apply(&params)
	}

	if params.net == nil {
		var err error
		if params.net, err = stdnet.NewNet(); err != nil {
			return nil, fmt.Errorf("failed to get create network: %w", err)
		}
	}

	ips, err := localInterfaces(params.net, params.ifFilter, params.ipFilter, params.networks, params.includeLoopback)
	if err != nil {
		return nil, err
	}

	conns := make([]net.PacketConn, 0, len(ports)*len(ips))
	for _, ip := range ips {
		for _, port := range ports {
			conn, listenErr := params.net.ListenUDP("udp", &net.UDPAddr{IP: ip, Port: port})
			if listenErr != nil {
				err = listenErr
				break
			}
			if params.readBufferSize > 0 {
				_ = conn.SetReadBuffer(params.readBufferSize)
			}
			if params.writeBufferSize > 0 {
				_ = conn.SetWriteBuffer(params.writeBufferSize)
			}
			if params.batchWriteSize > 0 {
				conns = append(conns, tudp.NewBatchConn(conn, params.batchWriteSize, params.batchWriteInterval))
			} else {
				conns = append(conns, conn)
			}
		}
		if err != nil {
			break
		}
	}

	if err != nil {
		for _, conn := range conns {
			_ = conn.Close()
		}
		return nil, err
	}

	muxes := make([]ice.UDPMux, 0, len(conns))
	for _, conn := range conns {
		mux := ice.NewUDPMuxDefault(ice.UDPMuxParams{
			Logger:  params.logger,
			UDPConn: conn,
			Net:     params.net,
		})
		muxes = append(muxes, mux)
	}

	return muxes, nil
}

// UDPMuxFromPortOption provide options for NewMultiUDPMuxFromPort
type UDPMuxFromPortOption interface {
	apply(*multiUDPMuxFromPortParam)
}

type multiUDPMuxFromPortParam struct {
	ifFilter           func(string) bool
	ipFilter           func(ip net.IP) bool
	networks           []ice.NetworkType
	readBufferSize     int
	writeBufferSize    int
	logger             logging.LeveledLogger
	includeLoopback    bool
	net                transport.Net
	batchWriteSize     int
	batchWriteInterval time.Duration
}

type udpMuxFromPortOption struct {
	f func(*multiUDPMuxFromPortParam)
}

func (o *udpMuxFromPortOption) apply(p *multiUDPMuxFromPortParam) {
	o.f(p)
}

// UDPMuxFromPortWithInterfaceFilter set the filter to filter out interfaces that should not be used
func UDPMuxFromPortWithInterfaceFilter(f func(string) bool) UDPMuxFromPortOption {
	return &udpMuxFromPortOption{
		f: func(p *multiUDPMuxFromPortParam) {
			p.ifFilter = f
		},
	}
}

// UDPMuxFromPortWithIPFilter set the filter to filter out IP addresses that should not be used
func UDPMuxFromPortWithIPFilter(f func(ip net.IP) bool) UDPMuxFromPortOption {
	return &udpMuxFromPortOption{
		f: func(p *multiUDPMuxFromPortParam) {
			p.ipFilter = f
		},
	}
}

// UDPMuxFromPortWithNetworks set the networks that should be used. default is both IPv4 and IPv6
func UDPMuxFromPortWithNetworks(networks ...ice.NetworkType) UDPMuxFromPortOption {
	return &udpMuxFromPortOption{
		f: func(p *multiUDPMuxFromPortParam) {
			p.networks = networks
		},
	}
}

// UDPMuxFromPortWithReadBufferSize set the UDP connection read buffer size
func UDPMuxFromPortWithReadBufferSize(size int) UDPMuxFromPortOption {
	return &udpMuxFromPortOption{
		f: func(p *multiUDPMuxFromPortParam) {
			p.readBufferSize = size
		},
	}
}

// UDPMuxFromPortWithWriteBufferSize set the UDP connection write buffer size
func UDPMuxFromPortWithWriteBufferSize(size int) UDPMuxFromPortOption {
	return &udpMuxFromPortOption{
		f: func(p *multiUDPMuxFromPortParam) {
			p.writeBufferSize = size
		},
	}
}

// UDPMuxFromPortWithLogger set the logger for the created UDPMux
func UDPMuxFromPortWithLogger(logger logging.LeveledLogger) UDPMuxFromPortOption {
	return &udpMuxFromPortOption{
		f: func(p *multiUDPMuxFromPortParam) {
			p.logger = logger
		},
	}
}

// UDPMuxFromPortWithLoopback set loopback interface should be included
func UDPMuxFromPortWithLoopback() UDPMuxFromPortOption {
	return &udpMuxFromPortOption{
		f: func(p *multiUDPMuxFromPortParam) {
			p.includeLoopback = true
		},
	}
}

// UDPMuxFromPortWithNet sets the network transport to use.
func UDPMuxFromPortWithNet(n transport.Net) UDPMuxFromPortOption {
	return &udpMuxFromPortOption{
		f: func(p *multiUDPMuxFromPortParam) {
			p.net = n
		},
	}
}

// UDPMuxFromPortWithBatchWrite enable batch write for UDPMux
func UDPMuxFromPortWithBatchWrite(batchWriteSize int, batchWriteInterval time.Duration) UDPMuxFromPortOption {
	return &udpMuxFromPortOption{
		f: func(p *multiUDPMuxFromPortParam) {
			p.batchWriteSize = batchWriteSize
			p.batchWriteInterval = batchWriteInterval
		},
	}
}
