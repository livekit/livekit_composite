package transport

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	bytesPacketSize = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Namespace:   "sipgo",
		Subsystem:   "transport",
		Name:        "packet_size_bytes",
		Help:        "Size of sent and received SIP packets",
		ConstLabels: nil,
		Buckets: []float64{
			250, 500, 1000,
			1100, 1150,
			1200, 1250,
			1300, 1350,
			1400, 1450,
			1500,
		},
	}, []string{"transport", "type"})
)
