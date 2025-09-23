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
	"context"
	"fmt"
	"net"
	"sync"
	"time"

	"github.com/pion/stun/v3"
	"github.com/pkg/errors"
	"golang.org/x/exp/slices"

	"github.com/livekit/protocol/logger"
)

const (
	stunPingTimeout   = 5 * time.Second
	validationTimeout = 5 * time.Second
)

func (conf *RTCConfig) determineIP() (string, error) {
	if conf.UseExternalIP {
		stunServers := conf.STUNServers
		if len(stunServers) == 0 {
			stunServers = DefaultStunServers
		}
		var err error
		for i := 0; i < 3; i++ {
			var ip string
			ip, err = GetExternalIP(context.Background(), stunServers, nil)
			if err == nil {
				return ip, nil
			} else {
				time.Sleep(500 * time.Millisecond)
			}
		}
		logger.Warnw("could not resolve external IP", err)
		return "", errors.Errorf("could not resolve external IP: %v", err)
	}

	// use local ip instead
	addresses, err := GetLocalIPAddresses(false, nil)
	if len(addresses) > 0 {
		return addresses[0], err
	}
	return "", err
}

func GetLocalIPAddresses(includeLoopback bool, preferredInterfaces []string) ([]string, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil, err
	}
	loopBacks := make([]string, 0)
	addresses := make([]string, 0)
	for _, iface := range ifaces {
		if len(preferredInterfaces) != 0 && !slices.Contains(preferredInterfaces, iface.Name) {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			var ip net.IP
			switch typedAddr := addr.(type) {
			case *net.IPNet:
				ip = typedAddr.IP.To4()
			case *net.IPAddr:
				ip = typedAddr.IP.To4()
			default:
				continue
			}
			if ip == nil {
				continue
			}
			if ip.IsLoopback() {
				loopBacks = append(loopBacks, ip.String())
			} else {
				addresses = append(addresses, ip.String())
			}
		}
	}

	if includeLoopback {
		addresses = append(addresses, loopBacks...)
	}

	if len(addresses) > 0 {
		return addresses, nil
	}
	if len(loopBacks) > 0 {
		return loopBacks, nil
	}
	return nil, fmt.Errorf("could not find local IP address")
}

func findExternalIP(ctx context.Context, stunServer string, localAddr net.Addr) (string, error) {
	ctx1, cancel1 := context.WithTimeout(ctx, stunPingTimeout)
	defer cancel1()

	dialer := &net.Dialer{
		LocalAddr: localAddr,
	}
	conn, err := dialer.Dial("udp4", stunServer)
	if err != nil {
		return "", err
	}
	c, err := stun.NewClient(conn)
	if err != nil {
		conn.Close()
		return "", err
	}

	closeConns := func() {
		c.Close()
		conn.Close()
	}

	message, err := stun.Build(stun.TransactionID, stun.BindingRequest)
	if err != nil {
		closeConns()
		return "", err
	}

	var mu sync.Mutex
	var stunErr error
	var ipAddr string
	err = c.Start(message, func(res stun.Event) {
		mu.Lock()
		defer mu.Unlock()

		if res.Error != nil {
			stunErr = res.Error
			return
		}

		var xorAddr stun.XORMappedAddress
		if err := xorAddr.GetFrom(res.Message); err != nil {
			stunErr = err
			return
		}
		ip := xorAddr.IP.To4()
		if ip != nil {
			ipAddr = ip.String()
		}
	})
	if err != nil {
		closeConns()
		return "", err
	}

	for {
		if ctx1.Err() != nil {
			closeConns()
			return "", ctx1.Err()
		}

		isDone := false
		mu.Lock()
		if stunErr != nil || ipAddr != "" {
			isDone = true
		}
		mu.Unlock()

		if isDone {
			break
		}

		time.Sleep(50 * time.Millisecond)
	}

	if stunErr != nil {
		closeConns()
		return "", stunErr
	}

	closeConns()
	logger.Infow(
		"found external IP via STUN",
		"localAddr", localAddr,
		"stunServer", stunServer,
		"externalIP", ipAddr,
	)
	return ipAddr, validateExternalIP(ctx, ipAddr, localAddr)
}

// GetExternalIP return external IP for localAddr from stun server. If localAddr is nil, a local address is chosen automatically,
// else the address will be used to validate the external IP is accessible from the outside.
func GetExternalIP(ctx context.Context, stunServers []string, localAddr net.Addr) (string, error) {
	if len(stunServers) == 0 {
		return "", errors.New("STUN servers are required but not defined")
	}

	ctx1, cancel1 := context.WithTimeout(ctx, time.Duration(len(stunServers))*(stunPingTimeout+validationTimeout))
	defer cancel1()

	var err error
	for _, ss := range stunServers {
		var ipAddr string
		ipAddr, err = findExternalIP(ctx1, ss, localAddr)
		if err == nil {
			return ipAddr, nil
		}
	}

	return "", err
}

// validateExternalIP validates that the external IP is accessible from the outside by listen the local address,
// it will send a magic string to the external IP and check the string is received by the local address.
func validateExternalIP(ctx context.Context, nodeIP string, addr net.Addr) error {
	if addr == nil {
		return nil
	}

	udpAddr, ok := addr.(*net.UDPAddr)
	if !ok {
		return errors.New("not UDP address")
	}

	srv, err := net.ListenUDP("udp", udpAddr)
	if err != nil {
		return err
	}
	defer srv.Close()

	magicString := "9#B8D2Nvg2xg5P$ZRwJ+f)*^Nne6*W3WamGY"

	validCh := make(chan struct{})
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := srv.Read(buf)
			if err != nil {
				logger.Debugw("error reading from UDP socket", "err", err)
				return
			}
			if string(buf[:n]) == magicString {
				close(validCh)
				return
			}
		}
	}()

	cli, err := net.DialUDP("udp", nil, &net.UDPAddr{IP: net.ParseIP(nodeIP), Port: srv.LocalAddr().(*net.UDPAddr).Port})
	if err != nil {
		return err
	}
	defer cli.Close()

	if _, err = cli.Write([]byte(magicString)); err != nil {
		return err
	}

	ctx1, cancel1 := context.WithTimeout(ctx, validationTimeout)
	defer cancel1()
	select {
	case <-validCh:
		return nil
	case <-ctx1.Done():
		logger.Warnw("could not validate external IP", ctx1.Err(), "ip", nodeIP, "from", addr)
		return ctx1.Err()
	}
}
