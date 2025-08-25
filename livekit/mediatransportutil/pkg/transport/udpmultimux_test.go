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
	"testing"

	"github.com/pion/ice/v4"
	"github.com/stretchr/testify/require"
	"golang.org/x/exp/slices"
)

type mockUDPMux struct {
	addrs []net.Addr
}

func (m *mockUDPMux) GetListenAddresses() []net.Addr {
	return m.addrs
}

func (m *mockUDPMux) GetConn(ufrag string, addr net.Addr) (net.PacketConn, error) {
	return nil, nil
}

func (m *mockUDPMux) RemoveConnByUfrag(ufrag string) {}

func (m *mockUDPMux) Close() error {
	return nil
}

func TestMultiPortsUDPMux(t *testing.T) {
	mux1 := &mockUDPMux{
		addrs: []net.Addr{
			&net.UDPAddr{IP: net.ParseIP("127.0.0.1"), Port: 8000},
		},
	}

	mux2 := &mockUDPMux{
		addrs: []net.Addr{
			&net.UDPAddr{IP: net.ParseIP("127.0.0.1"), Port: 8001},
		},
	}

	// Create a mux with different IP
	mux3 := &mockUDPMux{
		addrs: []net.Addr{
			&net.UDPAddr{IP: net.ParseIP("192.168.1.100"), Port: 8000},
		},
	}

	mux4 := &mockUDPMux{
		addrs: []net.Addr{
			&net.UDPAddr{IP: net.ParseIP("192.168.1.100"), Port: 8001},
		},
	}

	// Create standalone muxes (STUN port)
	standaloneMux1 := &mockUDPMux{
		addrs: []net.Addr{
			&net.UDPAddr{IP: net.ParseIP("127.0.0.1"), Port: 3478},
		},
	}

	standaloneMux2 := &mockUDPMux{
		addrs: []net.Addr{
			&net.UDPAddr{IP: net.ParseIP("192.168.1.100"), Port: 3478},
		},
	}

	muxes := []ice.UDPMux{mux1, mux2, mux3, mux4}
	standaloneMuxes := []ice.UDPMux{standaloneMux1, standaloneMux2}

	// Should contain all standalone addresses
	var standaloneAddrs []string
	for _, mux := range standaloneMuxes {
		addrs := mux.GetListenAddresses()
		for _, addr := range addrs {
			standaloneAddrs = append(standaloneAddrs, addr.String())
		}
	}

	// Create MultiPortsUDPMux
	multiMux := NewMultiPortsUDPMux(muxes, standaloneMuxes)
	addrs := multiMux.GetListenAddresses()

	for _, expectedAddr := range standaloneAddrs {
		found := false
		for i, addr := range addrs {
			if addr.String() == expectedAddr {
				found = true
				addrs = slices.Delete(addrs, i, i+1)
				break
			}
		}
		require.True(t, found, "Standalone address %s should be present", expectedAddr)
	}

	require.Len(t, addrs, 2, "Should have 2 balanced addresses left")

	var balancedAddrs []string
	var balancedPorts []int

	for _, addr := range addrs {
		udpAddr := addr.(*net.UDPAddr)
		balancedAddrs = append(balancedAddrs, udpAddr.IP.String())
		balancedPorts = append(balancedPorts, udpAddr.Port)
	}

	slices.Sort(balancedAddrs)
	require.True(t, balancedPorts[0] == balancedPorts[1], "Balanced ports should be equal")

	require.True(t, balancedPorts[0] == 8000 || balancedPorts[0] == 8001, "Balanced ports should be either 8000 or 8001")
}
