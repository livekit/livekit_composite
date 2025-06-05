package sip

import (
	sipgo "github.com/emiago/sipgo/sip"
)

// Response RFC 3261 - 7.2.
type Response = sipgo.Response

// NewResponse creates base structure of response.
func NewResponse(statusCode StatusCode, reason string) *Response {
	return sipgo.NewResponse(statusCode, reason)
}

// RFC 3261 - 8.2.6
func NewResponseFromRequest(req *Request, statusCode StatusCode, reason string, body []byte) *Response {
	return sipgo.NewResponseFromRequest(req, statusCode, reason, body)
}

// NewSDPResponseFromRequest is wrapper for 200 response with SDP body
func NewSDPResponseFromRequest(req *Request, body []byte) *Response {
	res := NewResponseFromRequest(req, StatusOK, "OK", body)
	res.AppendHeader(NewHeader("Content-Type", "application/sdp"))
	res.SetBody(body)
	return res
}

func CopyResponse(res *Response) *Response {
	return sipgo.CopyResponse(res)
}
