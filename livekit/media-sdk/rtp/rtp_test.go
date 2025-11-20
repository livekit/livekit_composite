package rtp

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// TestRTPStreams checks if sub-streams with one SSRC correctly synchronize their timestamps.
// For example, one stream may stop and resume after some time. Timestamps must adjust accordingly.
func TestRTPStreams(t *testing.T) {
	t.Run("alternating", func(t *testing.T) {
		var buf Buffer
		w := NewSeqWriter(&buf)

		const N = 5
		s1 := w.NewStream(0, 8000)
		s2 := w.NewStream(101, 8000)

		// Both stream emit frames after each other.
		// Timestamps should be in-sync.
		for i := range N {
			s1.WritePayload([]byte{byte(i)}, false)
			s2.WritePayload([]byte{byte(i)}, i == 0)
		}

		type packet struct {
			TS   uint32
			Type byte
			Ind  byte
		}

		var got []packet
		for _, p := range buf {
			got = append(got, packet{
				TS:   p.Timestamp,
				Type: p.PayloadType,
				Ind:  p.Payload[0],
			})
		}
		var exp []packet
		for i := range N {
			exp = append(exp,
				packet{
					TS:   160 * uint32(i),
					Type: 0,
					Ind:  byte(i),
				},
				packet{
					TS:   160 * uint32(i),
					Type: 101,
					Ind:  byte(i),
				},
			)
		}
		require.Equal(t, exp, got)
	})

	t.Run("alternating batches", func(t *testing.T) {
		var buf Buffer
		w := NewSeqWriter(&buf)

		const N, batch = 5, 5
		s1 := w.NewStream(0, 8000)
		s2 := w.NewStream(101, 8000)

		// Streams emit frames in short bursts.
		// Timestamps will still be in-sync between batches.
		for i := range N {
			for j := range batch {
				ind := i*batch + j
				s1.WritePayload([]byte{byte(ind)}, false)
			}
			for j := range batch {
				ind := i*batch + j
				s2.WritePayload([]byte{byte(ind)}, i == 0 && j == 0)
			}
		}

		type packet struct {
			TS   uint32
			Type byte
			Ind  byte
		}

		var got []packet
		for _, p := range buf {
			got = append(got, packet{
				TS:   p.Timestamp,
				Type: p.PayloadType,
				Ind:  p.Payload[0],
			})
		}
		var exp []packet
		for i := range N {
			for j := range batch {
				ind := i*batch + j
				exp = append(exp, packet{
					TS:   160 * uint32(ind),
					Type: 0,
					Ind:  byte(ind),
				})
			}
			for j := range batch {
				ind := i*batch + j
				exp = append(exp, packet{
					TS:   160 * uint32(ind),
					Type: 101,
					Ind:  byte(ind),
				})
			}
		}
		require.Equal(t, exp, got)
	})

	t.Run("alternating batches dtmf", func(t *testing.T) {
		var buf Buffer
		w := NewSeqWriter(&buf)

		const N, batch = 5, 5
		s1 := w.NewStream(0, 8000)
		s2 := w.NewStream(101, 8000)

		// Streams emit frames in short bursts.
		// This is a variation of the test that uses DTMF-like API,
		// where only the first packet of a batch increments the timestamp.
		// The timestamps of the first packets should still be in-sync between streams.
		for i := range N {
			for j := range batch {
				ind := i*batch + j
				s1.WritePayload([]byte{byte(ind)}, false)
			}
			for j := range batch {
				ind := i*batch + j
				s2.WritePayloadAtCurrent([]byte{byte(ind)}, j == 0)
			}
			s2.DelayN(batch)
		}

		type packet struct {
			TS   uint32
			Type byte
			Ind  byte
		}

		var got []packet
		for _, p := range buf {
			got = append(got, packet{
				TS:   p.Timestamp,
				Type: p.PayloadType,
				Ind:  p.Payload[0],
			})
		}
		var exp []packet
		for i := range N {
			for j := range batch {
				ind := i*batch + j
				exp = append(exp, packet{
					TS:   160 * uint32(ind),
					Type: 0,
					Ind:  byte(ind),
				})
			}
			for j := range batch {
				ind := i*batch + j
				exp = append(exp, packet{
					TS:   160 * uint32(i*batch),
					Type: 101,
					Ind:  byte(ind),
				})
			}
		}
		require.Equal(t, exp, got)
	})

	t.Run("one after another", func(t *testing.T) {
		var buf Buffer
		w := NewSeqWriter(&buf)

		const N = 5 + rtpStreamTSResetFrames
		s1 := w.NewStream(0, 8000)
		s2 := w.NewStream(101, 8000)

		// One stream emits all frames, followed by another one.
		// Timestamps on a second stream should synchronize
		// with the last TS of the first stream.
		for i := range N {
			s2.WritePayload([]byte{byte(i)}, i == 0)
		}
		for i := range N {
			s1.WritePayload([]byte{byte(i)}, false)
		}

		type packet struct {
			TS   uint32
			Type byte
			Ind  byte
		}

		var got []packet
		for _, p := range buf {
			got = append(got, packet{
				TS:   p.Timestamp,
				Type: p.PayloadType,
				Ind:  p.Payload[0],
			})
		}
		var exp []packet
		for i := range N {
			exp = append(exp, packet{
				TS:   160 * uint32(i),
				Type: 101,
				Ind:  byte(i),
			})
		}
		for i := range N {
			exp = append(exp, packet{
				TS:   160*(N-1) + 160*uint32(i),
				Type: 0,
				Ind:  byte(i),
			})
		}
		require.Equal(t, exp, got)
	})

	t.Run("one after another dtmf", func(t *testing.T) {
		var buf Buffer
		w := NewSeqWriter(&buf)

		const N = 5 + rtpStreamTSResetFrames
		s1 := w.NewStream(0, 8000)
		s2 := w.NewStream(101, 8000)

		// One stream emits all frames, followed by another one.
		// Timestamps on a second stream should synchronize
		// with the last TS of the first stream.
		// Except that the test uses DTMF-like API where
		// the timestamp is frozen at start for all frames.
		for i := range N {
			s2.WritePayloadAtCurrent([]byte{byte(i)}, i == 0)
		}
		s2.DelayN(N)
		for i := range N {
			s1.WritePayload([]byte{byte(i)}, false)
		}

		type packet struct {
			TS   uint32
			Type byte
			Ind  byte
		}

		var got []packet
		for _, p := range buf {
			got = append(got, packet{
				TS:   p.Timestamp,
				Type: p.PayloadType,
				Ind:  p.Payload[0],
			})
		}
		var exp []packet
		for i := range N {
			exp = append(exp, packet{
				TS:   0,
				Type: 101,
				Ind:  byte(i),
			})
		}
		for i := range N {
			exp = append(exp, packet{
				TS:   160*N + 160*uint32(i),
				Type: 0,
				Ind:  byte(i),
			})
		}
		require.Equal(t, exp, got)
	})
}
