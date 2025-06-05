package sip

import (
	"fmt"

	sipgo "github.com/emiago/sipgo/sip"
)

const (
	MTU uint = 1500

	DefaultHost     = "127.0.0.1"
	DefaultProtocol = "UDP"

	DefaultUdpPort int = 5060
	DefaultTcpPort int = 5060
	DefaultTlsPort int = 5061
	DefaultWsPort  int = 80
	DefaultWssPort int = 443

	RFC3261BranchMagicCookie = "z9hG4bK"
)

// The buffer size of the parser input channel.
// Parser is interface for decoding full message into sip message
type Parser interface {
	ParseSIP(data []byte) (Message, error)
}

// GenerateBranch returns random unique branch ID.
func GenerateBranch() string {
	return sipgo.GenerateBranch()
}

// GenerateBranchN returns random unique branch ID in format MagicCookie.<n chars>
func GenerateBranchN(n int) string {
	return sipgo.GenerateBranchN(n)
}

func GenerateTagN(n int) string {
	return sipgo.GenerateTagN(n)
}

// DefaultPort returns transport default port by network.
func DefaultPort(transport string) int {
	switch ASCIIToLower(transport) {
	case "tls":
		return DefaultTlsPort
	case "tcp":
		return DefaultTcpPort
	case "udp":
		return DefaultUdpPort
	case "ws":
		return DefaultWsPort
	case "wss":
		return DefaultWssPort
	default:
		return DefaultTcpPort
	}
}

func MakeDialogIDFromRequest(msg *Request) (string, error) {
	return sipgo.MakeDialogIDFromRequest(msg)
}

func MakeDialogIDFromResponse(msg *Response) (string, error) {
	return sipgo.MakeDialogIDFromResponse(msg)
}

// MakeDialogIDFromMessage creates dialog ID of message.
// returns error if callid or to tag or from tag does not exists
// Deprecated! Will be removed
func MakeDialogIDFromMessage(msg Message) (string, error) {
	switch m := msg.(type) {
	case *Request:
		return sipgo.MakeDialogIDFromRequest(m)
	case *Response:
		return sipgo.MakeDialogIDFromResponse(m)
	}
	return "", fmt.Errorf("unknown message format")
}

func MakeDialogID(callID, innerID, externalID string) string {
	return sipgo.MakeDialogID(callID, innerID, externalID)
}
