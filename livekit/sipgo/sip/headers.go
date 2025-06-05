package sip

import (
	sipgo "github.com/emiago/sipgo/sip"
)

// Header is a single SIP header.
type Header = sipgo.Header

// CopyHeader is internal interface for cloning headers.
// Maybe it will be full exposed later
type CopyHeader interface {
	headerClone() Header
}

// HeaderClone is generic function for cloning header
func HeaderClone(h Header) Header {
	return sipgo.HeaderClone(h)
}

// NewHeader creates generic type of header.
// Use it for unknown type of header
func NewHeader(name, value string) Header {
	return sipgo.NewHeader(name, value)
}

// ToHeader introduces SIP 'To' header
type ToHeader = sipgo.ToHeader

type FromHeader = sipgo.FromHeader

// ContactHeader is Contact header representation
type ContactHeader = sipgo.ContactHeader

// CallIDHeader is a Call-ID header presentation
type CallIDHeader = sipgo.CallIDHeader

// CSeq is CSeq header
type CSeqHeader = sipgo.CSeqHeader

// MaxForwardsHeader is Max-Forwards header representation
type MaxForwardsHeader = sipgo.MaxForwardsHeader

// ExpiresHeader is Expires header representation
type ExpiresHeader = sipgo.ExpiresHeader

// ContentLengthHeader is Content-Length header representation
type ContentLengthHeader = sipgo.ContentLengthHeader

// ViaHeader is Via header representation.
// It can be linked list of multiple via if they are part of one header
type ViaHeader = sipgo.ViaHeader

// ContentTypeHeader  is Content-Type header representation.
type ContentTypeHeader = sipgo.ContentTypeHeader

// RouteHeader  is Route header representation.
type RouteHeader = sipgo.RouteHeader

// RecordRouteHeader is Record-Route header representation.
type RecordRouteHeader = sipgo.RecordRouteHeader

// Copy all headers of one type from one message to another.
// Appending to any headers that were already there.
func CopyHeaders(name string, from, to Message) {
	sipgo.CopyHeaders(name, from, to)
}
