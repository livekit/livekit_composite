package sip

import (
	"errors"
	"net"
	"strings"

	sipgo "github.com/emiago/sipgo/sip"
)

// https://github.com/kpbird/golang_random_string
func RandString(n int) string {
	return sipgo.RandString(n)
}

// https://stackoverflow.com/questions/22892120/how-to-generate-a-random-string-of-a-fixed-length-in-go
func RandStringBytesMask(sb *strings.Builder, n int) string {
	return sipgo.RandStringBytesMask(sb, n)
}

// ASCIIToLower is faster than go version. It avoids one more loop
func ASCIIToLower(s string) string {
	return sipgo.ASCIIToLower(s)
}

func ASCIIToLowerInPlace(s []byte) {
	sipgo.ASCIIToLowerInPlace(s)
}

// HeaderToLower is fast ASCII lower string
func HeaderToLower(s string) string {
	return sipgo.HeaderToLower(s)
}

// Check uri is SIP fast
func UriIsSIP(s string) bool {
	switch s {
	case "sip", "SIP":
		return true
	}
	return false
}

func UriIsSIPS(s string) bool {
	switch s {
	case "sips", "SIPS":
		return true
	}
	return false
}

// Splits the given string into sections, separated by one or more characters
// from c_ABNF_WS.
func SplitByWhitespace(text string) []string {
	return sipgo.SplitByWhitespace(text)
}

// Forked from github.com/StefanKopieczek/gossip by @StefanKopieczek
func ResolveSelfIP() (net.IP, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil, err
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 {
			continue // interface down
		}
		if iface.Flags&net.FlagLoopback != 0 {
			continue // loopback interface
		}
		addrs, err := iface.Addrs()
		if err != nil {
			return nil, err
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() {
				continue
			}
			ip = ip.To4()
			if ip == nil {
				continue // not an ipv4 address
			}
			return ip, nil
		}
	}
	return nil, errors.New("server not connected to any network")
}

func NonceWrite(buf []byte) {
	sipgo.NonceWrite(buf)
}

// MessageShortString dumps short version of msg. Used only for logging
func MessageShortString(msg Message) string {
	switch m := msg.(type) {
	case *Request:
		return m.Short()
	case *Response:
		return m.Short()
	}
	return "Unknown message type"
}
