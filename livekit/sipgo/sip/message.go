package sip

import (
	sipgo "github.com/emiago/sipgo/sip"
)

type MessageHandler func(msg Message)

type RequestMethod = sipgo.RequestMethod

// StatusCode - response status code: 1xx - 6xx
type StatusCode = sipgo.StatusCode

const (
	// https://datatracker.ietf.org/doc/html/rfc3261#section-21
	StatusTrying            StatusCode = 100
	StatusRinging           StatusCode = 180
	StatusCallIsForwarded   StatusCode = 181
	StatusQueued            StatusCode = 182
	StatusSessionInProgress StatusCode = 183

	StatusOK StatusCode = 200

	StatusMovedPermanently StatusCode = 301
	StatusMovedTemporarily StatusCode = 302
	StatusUseProxy         StatusCode = 305

	StatusBadRequest                   StatusCode = 400
	StatusUnauthorized                 StatusCode = 401
	StatusPaymentRequired              StatusCode = 402
	StatusForbidden                    StatusCode = 403
	StatusNotFound                     StatusCode = 404
	StatusMethodNotAllowed             StatusCode = 405
	StatusNotAcceptable                StatusCode = 406
	StatusProxyAuthRequired            StatusCode = 407
	StatusRequestTimeout               StatusCode = 408
	StatusConflict                     StatusCode = 409
	StatusGone                         StatusCode = 410
	StatusRequestEntityTooLarge        StatusCode = 413
	StatusRequestURITooLong            StatusCode = 414
	StatusUnsupportedMediaType         StatusCode = 415
	StatusRequestedRangeNotSatisfiable StatusCode = 416
	StatusBadExtension                 StatusCode = 420
	StatusExtensionRequired            StatusCode = 421
	StatusIntervalToBrief              StatusCode = 423
	StatusTemporarilyUnavailable       StatusCode = 480
	StatusCallTransactionDoesNotExists StatusCode = 481
	StatusLoopDetected                 StatusCode = 482
	StatusTooManyHops                  StatusCode = 483
	StatusAddressIncomplete            StatusCode = 484
	StatusAmbiguous                    StatusCode = 485
	StatusBusyHere                     StatusCode = 486
	StatusRequestTerminated            StatusCode = 487
	StatusNotAcceptableHere            StatusCode = 488

	StatusInternalServerError StatusCode = 500
	StatusNotImplemented      StatusCode = 501
	StatusBadGateway          StatusCode = 502
	StatusServiceUnavailable  StatusCode = 503
	StatusGatewayTimeout      StatusCode = 504
	StatusVersionNotSupported StatusCode = 505
	StatusMessageTooLarge     StatusCode = 513

	StatusGlobalBusyEverywhere       StatusCode = 600
	StatusGlobalDecline              StatusCode = 603
	StatusGlobalDoesNotExistAnywhere StatusCode = 604
	StatusGlobalNotAcceptable        StatusCode = 606
)

// method names are defined here as constants for convenience.
const (
	INVITE    = sipgo.INVITE
	ACK       = sipgo.ACK
	CANCEL    = sipgo.CANCEL
	BYE       = sipgo.BYE
	REGISTER  = sipgo.REGISTER
	OPTIONS   = sipgo.OPTIONS
	SUBSCRIBE = sipgo.SUBSCRIBE
	NOTIFY    = sipgo.NOTIFY
	REFER     = sipgo.REFER
	INFO      = sipgo.INFO
	MESSAGE   = sipgo.MESSAGE
	PRACK     = sipgo.PRACK
	UPDATE    = sipgo.UPDATE
	PUBLISH   = sipgo.PUBLISH
)

type Message = sipgo.Message
