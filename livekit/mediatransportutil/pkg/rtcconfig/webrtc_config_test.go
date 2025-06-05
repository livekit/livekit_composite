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

package rtcconfig

import (
	"net"
	"testing"

	"github.com/stretchr/testify/require"
)

func Test_IPFilterFromConf(t *testing.T) {
	testData := IPsConfig{
		Includes: []string{"10.0.0.0/19"},
		Excludes: []string{"10.0.0.0/9", "10.192.0.0/11", "10.244.0.0/16", "172.16.0.0/12", "192.168.128.0/17"},
	}

	ipFilter, err := IPFilterFromConf(testData)
	require.NoError(t, err)

	testCases := []struct {
		ip       string
		expected bool
	}{
		{"10.0.0.10", true},
		{"10.0.0.1", true},
		{"10.0.31.255", true},
		{"10.0.32.1", false},
		{"10.192.0.1", false},
		{"10.244.0.1", false},
		{"172.16.0.10", false},
		{"192.168.128.5", false},
	}

	for _, tc := range testCases {
		testIP := net.ParseIP(tc.ip)

		if result := ipFilter(testIP); result != tc.expected {
			t.Errorf("For IP %s, expected %v but got %v", tc.ip, tc.expected, result)
		}
	}

	testData = IPsConfig{
		Includes: []string{"192.168.128.1"},
		Excludes: []string{"192.168.128.0/17"},
	}
	_, err = IPFilterFromConf(testData)
	require.Error(t, err)
}

func Test_InterfaceFilterFromConf(t *testing.T) {
	testData := InterfacesConfig{
		Includes: []string{"eth0", "eth1", "eth2"},
		Excludes: []string{"eth0", "eth3", "eth4"},
	}

	ifaceFilter := InterfaceFilterFromConf(testData)

	testCases := []struct {
		iface    string
		expected bool
	}{
		{"eth0", true},
		{"eth1", true},
		{"eth2", true},
		{"eth3", false},
		{"eth4", false},
		{"eth5", false},
	}

	for _, tc := range testCases {
		if result := ifaceFilter(tc.iface); result != tc.expected {
			t.Errorf("For interface %s, expected %v but got %v", tc.iface, tc.expected, result)
		}
	}
}
