// Copyright 2024 LiveKit, Inc.
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

package sip

import (
	"context"
	"fmt"
	"net/netip"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/pkg/errors"

	"github.com/livekit/protocol/livekit"
	"github.com/livekit/psrpc"
	"github.com/livekit/sipgo/sip"

	"github.com/livekit/sip/pkg/config"
)

const (
	notifyAckTimeout = 5 * time.Second
	referByeTimeout  = time.Second
)

var (
	referIdRegexp = regexp.MustCompile(`^refer(;id=(\d+))?$`)
)

// TODO: Add String method to sipgo.StatusCode
var statusNamesMap = map[int]string{
	100: "Trying",
	180: "Ringing",
	181: "CallIsForwarded",
	182: "Queued",
	183: "SessionInProgress",

	200: "OK",
	202: "Accepted",

	301: "MovedPermanently",
	302: "MovedTemporarily",
	305: "UseProxy",

	400: "BadRequest",
	401: "Unauthorized",
	402: "PaymentRequired",
	403: "Forbidden",
	404: "NotFound",
	405: "MethodNotAllowed",
	406: "NotAcceptable",
	407: "ProxyAuthRequired",
	408: "RequestTimeout",
	409: "Conflict",
	410: "Gone",
	413: "RequestEntityTooLarge",
	414: "RequestURITooLong",
	415: "UnsupportedMediaType",
	416: "RequestedRangeNotSatisfiable",
	420: "BadExtension",
	421: "ExtensionRequired",
	423: "IntervalToBrief",
	480: "TemporarilyUnavailable",
	481: "CallTransactionDoesNotExists",
	482: "LoopDetected",
	483: "TooManyHops",
	484: "AddressIncomplete",
	485: "Ambiguous",
	486: "BusyHere",
	487: "RequestTerminated",
	488: "NotAcceptableHere",

	500: "InternalServerError",
	501: "NotImplemented",
	502: "BadGateway",
	503: "ServiceUnavailable",
	504: "GatewayTimeout",
	505: "VersionNotSupported",
	513: "MessageTooLarge",

	600: "GlobalBusyEverywhere",
	603: "GlobalDecline",
	604: "GlobalDoesNotExistAnywhere",
	606: "GlobalNotAcceptable",
}

func sipStatus(code sip.StatusCode) string {
	if name := statusNamesMap[int(code)]; name != "" {
		return name
	}
	return fmt.Sprintf("Status%d", int(code))
}

func statusName(status int) string {
	if name := statusNamesMap[status]; name != "" {
		return fmt.Sprintf("%d-%s", status, name)
	}
	return fmt.Sprintf("status-%d", status)
}

type setHeadersFunc func(headers map[string]string) map[string]string

type Signaling interface {
	Address() sip.Uri
	From() sip.Uri
	To() sip.Uri
	ID() LocalTag
	Tag() RemoteTag
	CallID() string
	RemoteHeaders() Headers

	WriteRequest(req *sip.Request) error
	Transaction(req *sip.Request) (sip.ClientTransaction, error)

	Drop()
}

func transportFromReq(req *sip.Request) Transport {
	if to := req.To(); to != nil {
		if tr, _ := to.Params.Get("transport"); tr != "" {
			return Transport(strings.ToLower(tr))
		}
	}
	if via := req.Via(); via != nil {
		return Transport(strings.ToLower(via.Transport))
	}
	return ""
}

func transportPort(c *config.Config, t Transport) int {
	if t == TransportTLS {
		if tc := c.TLS; tc != nil {
			return tc.Port
		}
	}
	return c.SIPPort
}

func getContactURI(c *config.Config, ip netip.Addr, t Transport) URI {
	hostname := "" // use signaling IP by default, it's more robust
	if t == TransportTLS {
		hostname = c.SIPHostname
	}
	return URI{
		Host:      hostname,
		Addr:      netip.AddrPortFrom(ip, uint16(transportPort(c, t))),
		Transport: t,
	}
}

func sendAndACK(ctx context.Context, c Signaling, req *sip.Request) {
	tx, err := c.Transaction(req)
	if err != nil {
		return
	}
	defer tx.Terminate()
	r, err := sipResponse(ctx, tx, nil, nil)
	if err != nil {
		return
	}
	if r.StatusCode == 200 {
		_ = c.WriteRequest(sip.NewAckRequest(req, r, nil))
	}
}

func NewReferRequest(inviteRequest *sip.Request, inviteResponse *sip.Response, contactHeader *sip.ContactHeader, referToUrl string, headers map[string]string) *sip.Request {
	req := sip.NewRequest(sip.REFER, inviteRequest.Recipient)

	req.SipVersion = inviteRequest.SipVersion
	sip.CopyHeaders("Via", inviteRequest, req)
	// if inviteResponse.IsSuccess() {
	// update branch, 2xx ACK is separate Tx
	viaHop := req.Via()
	viaHop.Params.Add("branch", sip.GenerateBranch())
	// }

	if len(inviteRequest.GetHeaders("Route")) > 0 {
		sip.CopyHeaders("Route", inviteRequest, req)
	} else {
		hdrs := inviteResponse.GetHeaders("Record-Route")
		for i := len(hdrs) - 1; i >= 0; i-- {
			rrh, ok := hdrs[i].(*sip.RecordRouteHeader)
			if !ok {
				continue
			}

			h := rrh.Clone()
			req.AppendHeader(h)
		}
	}

	maxForwardsHeader := sip.MaxForwardsHeader(70)
	req.AppendHeader(&maxForwardsHeader)

	if h := inviteRequest.From(); h != nil {
		sip.CopyHeaders("From", inviteRequest, req)
	}

	if h := inviteResponse.To(); h != nil {
		sip.CopyHeaders("To", inviteResponse, req)
	}

	if h := inviteRequest.CallID(); h != nil {
		sip.CopyHeaders("Call-ID", inviteRequest, req)
	}

	if h := inviteRequest.CSeq(); h != nil {
		sip.CopyHeaders("CSeq", inviteRequest, req)
	}

	req.AppendHeader(contactHeader)

	cseq := req.CSeq()
	cseq.SeqNo = cseq.SeqNo + 1
	cseq.MethodName = sip.REFER

	// Set Refer-To header
	referTo := sip.NewHeader("Refer-To", referToUrl)
	req.AppendHeader(referTo)
	req.AppendHeader(sip.NewHeader("Allow", "INVITE, ACK, CANCEL, BYE, NOTIFY, REFER, MESSAGE, OPTIONS, INFO, SUBSCRIBE"))

	req.SetTransport(inviteRequest.Transport())
	req.SetSource(inviteRequest.Source())
	req.SetDestination(inviteRequest.Destination())

	for k, v := range headers {
		req.AppendHeader(sip.NewHeader(k, v))
	}

	req.SetBody(nil)

	return req
}

func sendRefer(ctx context.Context, c Signaling, req *sip.Request, stop <-chan struct{}) (*sip.Response, error) {
	tx, err := c.Transaction(req)
	if err != nil {
		return nil, err
	}
	defer tx.Terminate()

	ctx = context.WithoutCancel(ctx)
	resp, err := sipResponse(ctx, tx, stop, nil)
	if err != nil {
		return nil, err
	}

	switch resp.StatusCode {
	case sip.StatusOK, 202: // 202 is Accepted
		return resp, nil
	default:
		return resp, &livekit.SIPStatus{
			Code:   livekit.SIPStatusCode(resp.StatusCode),
			Status: resp.Reason,
		}
	}
}

func parseNotifyBody(body string) (int, error) {
	v := strings.Split(body, " ")

	if len(v) < 2 {
		return 0, psrpc.NewErrorf(psrpc.InvalidArgument, "invalid notify body: not enough tokens")
	}

	if strings.ToUpper(v[0]) != "SIP/2.0" {
		return 0, psrpc.NewErrorf(psrpc.InvalidArgument, "invalid notify body: wrong prefix or SIP version")
	}

	c, err := strconv.Atoi(v[1])
	if err != nil {
		return 0, psrpc.NewError(psrpc.InvalidArgument, err)
	}

	return c, nil
}

func handleNotify(req *sip.Request) (method sip.RequestMethod, cseq uint32, status int, err error) {
	event := req.GetHeader("Event")
	if event == nil {
		event = req.GetHeader("o")
	}
	if event == nil {
		return "", 0, 0, psrpc.NewErrorf(psrpc.MalformedRequest, "no event in NOTIFY request")
	}

	var cseq64 uint64

	if m := referIdRegexp.FindStringSubmatch(strings.ToLower(event.Value())); len(m) > 0 {
		// REFER Notify
		method = sip.REFER

		if len(m) >= 3 {
			cseq64, _ = strconv.ParseUint(m[2], 10, 32)
		}

		status, err = parseNotifyBody(string(req.Body()))
		if err != nil {
			return "", 0, 0, err
		}

		return method, uint32(cseq64), status, nil
	}
	return "", 0, 0, psrpc.NewErrorf(psrpc.Unimplemented, "unknown event")
}

func sipStatusForErrorCode(code psrpc.ErrorCode) sip.StatusCode {
	switch code {
	case psrpc.OK:
		return sip.StatusOK
	case psrpc.Canceled, psrpc.DeadlineExceeded:
		return sip.StatusRequestTimeout
	case psrpc.Unknown, psrpc.MalformedResponse, psrpc.Internal, psrpc.DataLoss:
		return sip.StatusInternalServerError
	case psrpc.InvalidArgument, psrpc.MalformedRequest:
		return sip.StatusBadRequest
	case psrpc.NotFound:
		return sip.StatusNotFound
	case psrpc.NotAcceptable:
		return sip.StatusNotAcceptable
	case psrpc.AlreadyExists, psrpc.Aborted:
		return sip.StatusConflict
	case psrpc.PermissionDenied:
		return sip.StatusForbidden
	case psrpc.ResourceExhausted:
		return sip.StatusTemporarilyUnavailable
	case psrpc.FailedPrecondition:
		return sip.StatusCallTransactionDoesNotExists
	case psrpc.OutOfRange:
		return sip.StatusRequestedRangeNotSatisfiable
	case psrpc.Unimplemented:
		return sip.StatusNotImplemented
	case psrpc.Unavailable:
		return sip.StatusServiceUnavailable
	case psrpc.Unauthenticated:
		return sip.StatusUnauthorized
	default:
		return sip.StatusInternalServerError
	}
}

func sipCodeAndMessageFromError(err error) (code sip.StatusCode, msg string) {
	code = 200
	var psrpcErr psrpc.Error
	if errors.As(err, &psrpcErr) {
		code = sipStatusForErrorCode(psrpcErr.Code())
	} else if err != nil {
		code = 500
	}

	msg = "success"
	if err != nil {
		msg = err.Error()
	}

	return code, msg
}

func setCSeq(req *sip.Request, cseq uint32) {
	h := &sip.CSeqHeader{
		MethodName: req.Method,
		SeqNo:      cseq,
	}

	req.RemoveHeader(h.Name())
	req.AppendHeader(h)
}

func ToSIPUri(ip string, u sip.Uri) *livekit.SIPUri {
	tr, _ := u.UriParams.Get("transport")
	url := &livekit.SIPUri{
		User:      u.User,
		Host:      u.Host,
		Ip:        ip,
		Port:      uint32(u.Port),
		Transport: SIPTransportFrom(Transport(tr)),
	}
	return url
}
