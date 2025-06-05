package sip

import (
	"strings"

	sipgo "github.com/emiago/sipgo/sip"
)

// Request RFC 3261 - 7.1.
type Request = sipgo.Request

func NewRequest(method RequestMethod, recipient Uri) *Request {
	return sipgo.NewRequest(method, recipient)
}

// NewAckRequest creates ACK request for 2xx INVITE
// https://tools.ietf.org/html/rfc3261#section-13.2.2.4
func NewAckRequest(inviteRequest *Request, inviteResponse *Response, body []byte) *Request {
	Recipient := inviteRequest.Recipient
	if contact := inviteResponse.Contact(); contact != nil {
		// For ws and wss (like clients in browser), don't use Contact
		if strings.Index(strings.ToLower(Recipient.String()), "transport=ws") == -1 {
			Recipient = contact.Address
		}
	}
	ackRequest := sipgo.NewRequest(
		ACK,
		Recipient,
	)
	ackRequest.SipVersion = inviteRequest.SipVersion
	CopyHeaders("Via", inviteRequest, ackRequest)
	if inviteResponse.IsSuccess() {
		// update branch, 2xx ACK is separate Tx
		viaHop := ackRequest.Via()
		viaHop.Params.Add("branch", GenerateBranch())
	}

	if len(inviteRequest.GetHeaders("Route")) > 0 {
		CopyHeaders("Route", inviteRequest, ackRequest)
	} else {
		hdrs := inviteResponse.GetHeaders("Record-Route")
		for i := len(hdrs) - 1; i >= 0; i-- {
			h := HeaderClone(hdrs[i])
			ackRequest.AppendHeader(h)
		}
	}

	maxForwardsHeader := MaxForwardsHeader(70)
	ackRequest.AppendHeader(&maxForwardsHeader)
	if h := inviteRequest.From(); h != nil {
		ackRequest.AppendHeader(HeaderClone(h))
	}

	if h := inviteResponse.To(); h != nil {
		ackRequest.AppendHeader(HeaderClone(h))
	}

	if h := inviteRequest.CallID(); h != nil {
		ackRequest.AppendHeader(HeaderClone(h))
	}

	if h := inviteRequest.CSeq(); h != nil {
		ackRequest.AppendHeader(HeaderClone(h))
	}

	cseq := ackRequest.CSeq()
	cseq.MethodName = ACK

	/*
	   	A UAC SHOULD include a Contact header field in any target refresh
	    requests within a dialog, and unless there is a need to change it,
	    the URI SHOULD be the same as used in previous requests within the
	    dialog.  If the "secure" flag is true, that URI MUST be a SIPS URI.
	    As discussed in Section 12.2.2, a Contact header field in a target
	    refresh request updates the remote target URI.  This allows a UA to
	    provide a new contact address, should its address change during the
	    duration of the dialog.
	*/

	if h := inviteRequest.Contact(); h != nil {
		ackRequest.AppendHeader(HeaderClone(h))
	}

	ackRequest.SetBody(body)
	ackRequest.SetTransport(inviteRequest.Transport())
	ackRequest.SetSource(inviteRequest.Source())
	ackRequest.SetDestination(inviteRequest.Destination())

	return ackRequest
}

func NewCancelRequest(requestForCancel *Request) *Request {
	cancelReq := NewRequest(
		CANCEL,
		requestForCancel.Recipient,
	)
	cancelReq.SipVersion = requestForCancel.SipVersion

	viaHop := requestForCancel.Via()
	cancelReq.AppendHeader(viaHop.Clone())
	CopyHeaders("Route", requestForCancel, cancelReq)
	maxForwardsHeader := MaxForwardsHeader(70)
	cancelReq.AppendHeader(&maxForwardsHeader)

	if h := requestForCancel.From(); h != nil {
		cancelReq.AppendHeader(HeaderClone(h))
	}
	if h := requestForCancel.To(); h != nil {
		cancelReq.AppendHeader(HeaderClone(h))
	}
	if h := requestForCancel.CallID(); h != nil {
		cancelReq.AppendHeader(HeaderClone(h))
	}
	if h := requestForCancel.CSeq(); h != nil {
		cancelReq.AppendHeader(HeaderClone(h))
	}
	cseq := cancelReq.CSeq()
	cseq.MethodName = CANCEL

	// cancelReq.SetBody([]byte{})
	cancelReq.SetTransport(requestForCancel.Transport())
	cancelReq.SetSource(requestForCancel.Source())
	cancelReq.SetDestination(requestForCancel.Destination())

	return cancelReq
}

// NewByeRequest creates bye request from invite
// TODO do some testing
func NewByeRequest(inviteRequest *Request, inviteResponse *Response, body []byte) *Request {
	Recipient := inviteRequest.Recipient

	byeRequest := NewRequest(
		BYE,
		Recipient,
	)
	byeRequest.SipVersion = inviteRequest.SipVersion
	CopyHeaders("Via", inviteRequest, byeRequest)
	// if inviteResponse.IsSuccess() {
	// update branch, 2xx ACK is separate Tx
	viaHop := byeRequest.Via()
	viaHop.Params.Add("branch", GenerateBranch())
	// }

	if len(inviteRequest.GetHeaders("Route")) > 0 {
		CopyHeaders("Route", inviteRequest, byeRequest)
	} else {
		hdrs := inviteResponse.GetHeaders("Record-Route")
		for i := len(hdrs) - 1; i >= 0; i-- {
			h := HeaderClone(hdrs[i])
			byeRequest.AppendHeader(h)
		}
	}

	maxForwardsHeader := MaxForwardsHeader(70)
	byeRequest.AppendHeader(&maxForwardsHeader)
	if h := inviteRequest.From(); h != nil {
		byeRequest.AppendHeader(HeaderClone(h))
	}

	if h := inviteResponse.To(); h != nil {
		byeRequest.AppendHeader(HeaderClone(h))
	}

	if h := inviteRequest.CallID(); h != nil {
		byeRequest.AppendHeader(HeaderClone(h))
	}

	if h := inviteRequest.CSeq(); h != nil {
		byeRequest.AppendHeader(HeaderClone(h))
	}

	cseq := byeRequest.CSeq()
	cseq.SeqNo = cseq.SeqNo + 1
	cseq.MethodName = BYE

	byeRequest.SetBody(body)
	byeRequest.SetTransport(inviteRequest.Transport())
	byeRequest.SetSource(inviteRequest.Source())
	byeRequest.SetDestination(inviteRequest.Destination())

	return byeRequest
}

func CopyRequest(req *Request) *Request {
	return sipgo.CopyRequest(req)
}
