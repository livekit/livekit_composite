package sip

import (
	sipgo "github.com/emiago/sipgo/sip"
)

// Whitespace recognised by SIP protocol.
const abnfWs = " \t"

// HeaderParams are key value params. They do not provide order by default due to performance reasons
type HeaderParams = sipgo.HeaderParams

func NewParams() HeaderParams {
	return sipgo.NewParams()
}
