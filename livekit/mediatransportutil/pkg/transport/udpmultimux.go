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
	"net"
	"sync/atomic"

	"github.com/pion/ice/v4"
)

type MultiPortsUDPMux struct {
	*ice.MultiUDPMuxDefault

	// Manage port balance for mux that listen on multiple ports for same IP,
	// for each IP, only return one addr (one port) for each GetListenAddresses call to
	// avoid duplicate ip candidates be gathered for a single ice agent.
	multiPortsAddresses []*multiPortsAddress
}

type addrMux struct {
	addr net.Addr
}

// each multiPortsAddress represents muxes listen on different ports of a same IP
type multiPortsAddress struct {
	addresseMuxes []*addrMux
	currentMux    atomic.Int32
}

func (mpa *multiPortsAddress) next() net.Addr {
	idx := mpa.currentMux.Add(1) % int32(len(mpa.addresseMuxes))
	return mpa.addresseMuxes[idx].addr
}

// NewMultiUDPMuxDefault creates an instance of MultiUDPMuxDefault that
// uses the provided UDPMux instances.
func NewMultiPortsUDPMux(muxes ...ice.UDPMux) *MultiPortsUDPMux {
	mux := ice.NewMultiUDPMuxDefault(muxes...)

	ipToAddrs := make(map[string]*multiPortsAddress)
	for _, mux := range muxes {
		for _, addr := range mux.GetListenAddresses() {
			udpAddr, _ := addr.(*net.UDPAddr)
			ip := udpAddr.IP.String()
			if mpa, ok := ipToAddrs[ip]; ok {
				mpa.addresseMuxes = append(mpa.addresseMuxes, &addrMux{addr})
			} else {
				ipToAddrs[ip] = &multiPortsAddress{
					addresseMuxes: []*addrMux{{addr}},
				}
			}
		}
	}

	multiPortsAddresses := make([]*multiPortsAddress, 0, len(ipToAddrs))
	for _, mpa := range ipToAddrs {
		multiPortsAddresses = append(multiPortsAddresses, mpa)
	}
	return &MultiPortsUDPMux{
		MultiUDPMuxDefault:  mux,
		multiPortsAddresses: multiPortsAddresses,
	}
}

// GetListenAddresses returns the list of addresses that this mux is listening on,
// if there are multiple muxes listening to different ports of the same IP addr,
// it will return one mux of them in round robin fashion.
func (m *MultiPortsUDPMux) GetListenAddresses() []net.Addr {
	addrs := make([]net.Addr, 0, len(m.multiPortsAddresses))
	for _, mpa := range m.multiPortsAddresses {
		addrs = append(addrs, mpa.next())
	}
	return addrs
}
