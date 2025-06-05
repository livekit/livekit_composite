package interceptor

import (
	"math"
	"sync"
	"time"

	"github.com/pion/interceptor"
	"github.com/pion/rtcp"

	util "github.com/livekit/mediatransportutil"
)

type RTTFromXRFactory struct {
	onRTT func(uint32)
}

func NewRTTFromXRFactory(onRTT func(uint32)) *RTTFromXRFactory {
	return &RTTFromXRFactory{
		onRTT: onRTT,
	}
}

func (f *RTTFromXRFactory) NewInterceptor(id string) (interceptor.Interceptor, error) {
	return &RTTFromXR{
		close: make(chan struct{}),
		onRTT: f.onRTT,
	}, nil
}

type RTTFromXR struct {
	lock             sync.Mutex
	started          bool
	remoteTrackSsrcs []uint32
	localTrackSsrcs  []uint32
	writer           interceptor.RTCPWriter
	onRTT            func(uint32)

	close chan struct{}
}

func (r *RTTFromXR) start() {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			var senderSsrc uint32
			r.lock.Lock()
			if len(r.remoteTrackSsrcs) > 0 {
				senderSsrc = r.remoteTrackSsrcs[0]
			}
			writer := r.writer
			r.lock.Unlock()
			if senderSsrc == 0 || writer == nil {
				continue
			}

			xr := rtcp.ExtendedReport{
				SenderSSRC: senderSsrc,
				Reports: []rtcp.ReportBlock{
					&rtcp.ReceiverReferenceTimeReportBlock{
						NTPTimestamp: uint64(util.ToNtpTime(time.Now())),
					},
				},
			}
			writer.Write([]rtcp.Packet{&xr}, interceptor.Attributes{})
		case <-r.close:
			return
		}
	}
}

func (r *RTTFromXR) BindRemoteStream(info *interceptor.StreamInfo, reader interceptor.RTPReader) interceptor.RTPReader {
	r.lock.Lock()
	if !r.started {
		r.started = true
		go r.start()
	}

	r.remoteTrackSsrcs = append(r.remoteTrackSsrcs, info.SSRC)
	r.lock.Unlock()

	return reader
}

func (r *RTTFromXR) UnbindRemoteStream(info *interceptor.StreamInfo) {
	r.lock.Lock()
	for i, ssrc := range r.remoteTrackSsrcs {
		if ssrc == info.SSRC {
			r.remoteTrackSsrcs[i] = r.remoteTrackSsrcs[len(r.remoteTrackSsrcs)-1]
			r.remoteTrackSsrcs = r.remoteTrackSsrcs[:len(r.remoteTrackSsrcs)-1]
			break
		}
	}
	r.lock.Unlock()
}

func (r *RTTFromXR) BindLocalStream(info *interceptor.StreamInfo, writer interceptor.RTPWriter) interceptor.RTPWriter {
	r.lock.Lock()
	r.localTrackSsrcs = append(r.localTrackSsrcs, info.SSRC)
	r.lock.Unlock()
	return writer
}

func (r *RTTFromXR) UnbindLocalStream(info *interceptor.StreamInfo) {
	r.lock.Lock()
	for i, ssrc := range r.localTrackSsrcs {
		if ssrc == info.SSRC {
			r.localTrackSsrcs[i] = r.localTrackSsrcs[len(r.localTrackSsrcs)-1]
			r.localTrackSsrcs = r.localTrackSsrcs[:len(r.localTrackSsrcs)-1]
			break
		}
	}
	r.lock.Unlock()

}

func (r *RTTFromXR) BindRTCPReader(reader interceptor.RTCPReader) interceptor.RTCPReader {
	return interceptor.RTCPReaderFunc(func(in []byte, a interceptor.Attributes) (int, interceptor.Attributes, error) {
		n, a, err := reader.Read(in, a)
		if err != nil {
			return n, a, err
		}

		if a == nil {
			a = make(interceptor.Attributes)
		}
		pkts, err := a.GetRTCPPackets(in[:n])
		if err != nil {
			return n, a, err
		}

		for _, pkt := range pkts {
			if xr, ok := pkt.(*rtcp.ExtendedReport); ok {
				r.handleXR(xr)
				break
			}
		}
		return n, a, nil
	})
}

func (r *RTTFromXR) BindRTCPWriter(writer interceptor.RTCPWriter) interceptor.RTCPWriter {
	r.lock.Lock()
	r.writer = writer
	r.lock.Unlock()
	return writer
}

func (r *RTTFromXR) Close() error {
	close(r.close)
	return nil
}

func (r *RTTFromXR) handleXR(xr *rtcp.ExtendedReport) {
	for _, report := range xr.Reports {
		switch rr := report.(type) {
		case *rtcp.ReceiverReferenceTimeReportBlock:
			var responses []rtcp.Packet
			r.lock.Lock()
			for _, ssrc := range r.localTrackSsrcs {
				responses = append(responses, &rtcp.ExtendedReport{
					SenderSSRC: ssrc,
					Reports: []rtcp.ReportBlock{
						&rtcp.DLRRReportBlock{
							Reports: []rtcp.DLRRReport{
								{
									SSRC:   xr.SenderSSRC,
									LastRR: uint32(rr.NTPTimestamp >> 16),
									DLRR:   0, //respond immediately
								},
							},
						},
					},
				})
			}
			writer := r.writer
			r.lock.Unlock()
			if len(responses) > 0 && writer != nil {
				writer.Write(responses, nil)
			}

		case *rtcp.DLRRReportBlock:
			for _, dlrrReport := range rr.Reports {
				nowNTP := util.ToNtpTime(time.Now())
				nowNTP32 := uint32(nowNTP >> 16)
				ntpDiff := nowNTP32 - dlrrReport.LastRR - dlrrReport.DLRR
				rtt := uint32(math.Ceil(float64(ntpDiff) * 1000.0 / 65536.0))
				r.onRTT(rtt)
				break
			}
		}
	}
}
