// Copyright 2023 LiveKit, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package bucket

import (
	"encoding/binary"
	"errors"
	"testing"

	"github.com/pion/rtp"
	"github.com/stretchr/testify/require"
)

func testQueue[T uint16 | uint32 | uint64](t *testing.T, q *Bucket[T]) {
	TestPackets := []*rtp.Packet{
		{
			Header: rtp.Header{
				SequenceNumber: 1,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 3,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 4,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 6,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 7,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 10,
			},
		},
	}

	for _, p := range TestPackets {
		buf, err := p.Marshal()
		require.NoError(t, err)
		require.NotPanics(t, func() {
			_, _ = q.AddPacket(buf)
			require.Equal(t, T(p.Header.SequenceNumber), q.HeadSequenceNumber())
		})
	}

	pktToolarge := make([]byte, MaxPktSize+1)
	_, err := q.AddPacket(pktToolarge)
	require.ErrorIs(t, err, ErrPacketTooLarge)

	expectedSN := T(6)
	np := rtp.Packet{}
	buff := make([]byte, MaxPktSize)
	i, err := q.GetPacket(buff, expectedSN)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN), np.SequenceNumber)

	// add an out-of-order packet and ensure it can be retrieved
	np2 := &rtp.Packet{
		Header: rtp.Header{
			SequenceNumber: 8,
		},
	}
	buf, err := np2.Marshal()
	require.NoError(t, err)
	storedPkt, err := q.AddPacket(buf)
	require.NoError(t, err)
	expectedSN = 8
	i, err = q.GetPacket(buff, expectedSN)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN), np.SequenceNumber)

	// adding a duplicate should not add and return retransmitted packet error
	_, err = q.AddPacket(buf)
	require.ErrorIs(t, err, ErrRTXPacket)

	// adding a duplicate with incorrect size should return rtx size error
	_, err = q.AddPacket(buf[:len(buf)-1])
	require.ErrorIs(t, err, ErrRTXPacketSize)

	// mangle the sequence number of a duplicate inside the bucket, should return mismatch error
	storedSN := binary.BigEndian.Uint16(storedPkt[seqNumOffset:])
	binary.BigEndian.PutUint16(storedPkt[seqNumOffset:], storedSN-1)
	_, err = q.AddPacket(buf)
	require.ErrorIs(t, err, ErrPacketMismatch)
	// restore and ensure that RTX error is returned
	binary.BigEndian.PutUint16(storedPkt[seqNumOffset:], storedSN)
	_, err = q.AddPacket(buf)
	require.ErrorIs(t, err, ErrRTXPacket)

	// try to get old packets
	_, err = q.GetPacket(buff, 0)
	require.ErrorIs(t, err, ErrPacketTooOld)

	// ask for something ahead of headSN
	_, err = q.GetPacket(buff, 11)
	require.ErrorIs(t, err, ErrPacketTooNew)

	q.ResyncOnNextPacket()

	// should be able to get packets before adding a packet which will resync
	expectedSN = 8
	i, err = q.GetPacket(buff, expectedSN)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN), np.SequenceNumber)

	// adding a packet will resync and invalidate all existing
	buf, err = TestPackets[1].Marshal()
	require.NoError(t, err)
	_, err = q.AddPacket(buf)
	require.NoError(t, err)

	// try to get a packet that was valid before resync, should not be found
	_, err = q.GetPacket(buff, 8)
	require.ErrorIs(t, err, ErrPacketTooNew)

	// getting a packet added after resync should succeed
	expectedSN = T(TestPackets[1].Header.SequenceNumber)
	i, err = q.GetPacket(buff, expectedSN)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN), np.SequenceNumber)

	// adding a packet with sequence number override
	buf, err = TestPackets[2].Marshal()
	require.NoError(t, err)
	// sequence number in packet is 4, add with 5
	_, err = q.AddPacketWithSequenceNumber(buf, 5)
	require.NoError(t, err)

	// should not be able to get sequence number 4 that was in the packet that was given to the bucket
	// it should have been overwritten
	expectedSN = T(TestPackets[2].Header.SequenceNumber)
	_, err = q.GetPacket(buff, expectedSN)
	require.ErrorIs(t, err, ErrPacketSizeInvalid)

	// should be able to get overridden sequence number
	expectedSN = 5
	i, err = q.GetPacket(buff, expectedSN)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN), np.SequenceNumber)
}

func TestQueue(t *testing.T) {
	testQueue(t, NewBucket[uint16](10))
	testQueue(t, NewBucket[uint32](10))
	testQueue(t, NewBucket[uint64](10))
}

func testQueueEdges[T uint16 | uint32 | uint64](t *testing.T, q *Bucket[T]) {
	TestPackets := []*rtp.Packet{
		{
			Header: rtp.Header{
				SequenceNumber: 65533,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 65534,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 2,
			},
		},
	}

	for _, p := range TestPackets {
		require.NotPanics(t, func() {
			buf, err := p.Marshal()
			require.NoError(t, err)
			require.NotPanics(t, func() {
				_, _ = q.AddPacket(buf)
			})
		})
	}

	expectedSN := T(65534)
	np := rtp.Packet{}
	buff := make([]byte, MaxPktSize)
	i, err := q.GetPacket(buff, expectedSN)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN), np.SequenceNumber)

	// add an out-of-order packet where the head sequence has wrapped and ensure it can be retrieved
	np2 := rtp.Packet{
		Header: rtp.Header{
			SequenceNumber: 65535,
		},
	}
	buf, err := np2.Marshal()
	require.NoError(t, err)
	_, _ = q.AddPacket(buf)
	i, err = q.GetPacket(buff, expectedSN+1)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN)+1, np.SequenceNumber)
}

func TestQueueEdges(t *testing.T) {
	testQueueEdges(t, NewBucket[uint16](10))
	testQueueEdges(t, NewBucket[uint32](10))
	testQueueEdges(t, NewBucket[uint64](10))
}

func TestQueueEdgesExtended(t *testing.T) {
	TestPackets := []*rtp.Packet{
		{
			Header: rtp.Header{
				SequenceNumber: 65533,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 65534,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 2,
			},
		},
	}

	q := NewBucket[uint64](100)

	for _, p := range TestPackets {
		require.NotPanics(t, func() {
			buf, err := p.Marshal()
			require.NoError(t, err)
			require.NotPanics(t, func() {
				if p.Header.SequenceNumber < 32768 {
					_, _ = q.AddPacketWithSequenceNumber(buf, uint64(p.Header.SequenceNumber)+65536)
				} else {
					_, _ = q.AddPacketWithSequenceNumber(buf, uint64(p.Header.SequenceNumber))
				}
			})
		})
	}

	expectedSN := uint64(65534)
	np := rtp.Packet{}
	buff := make([]byte, MaxPktSize)
	i, err := q.GetPacket(buff, expectedSN)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN), np.SequenceNumber)

	// add an out-of-order packet where the head sequence has wrapped and ensure it can be retrieved
	np2 := rtp.Packet{
		Header: rtp.Header{
			SequenceNumber: 65535,
		},
	}
	buf, err := np2.Marshal()
	require.NoError(t, err)
	_, _ = q.AddPacketWithSequenceNumber(buf, uint64(np2.Header.SequenceNumber))

	i, err = q.GetPacket(buff, expectedSN+1)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN)+1, np.SequenceNumber)

	// wrap around should be linear in extended range (0/65536 and 1/65537 were not added)
	_, err = q.GetPacket(buff, expectedSN+2)
	require.Error(t, err, ErrPacketSizeInvalid)
	_, err = q.GetPacket(buff, expectedSN+3)
	require.Error(t, err, ErrPacketSizeInvalid)

	i, err = q.GetPacket(buff, expectedSN+4)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN)+4, np.SequenceNumber)
}

func testQueueWrap[T uint16 | uint32 | uint64](t *testing.T, q *Bucket[T]) {
	TestPackets := []*rtp.Packet{
		{
			Header: rtp.Header{
				SequenceNumber: 1,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 3,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 4,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 6,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 7,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 10,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 13,
			},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 15,
			},
		},
	}

	for _, p := range TestPackets {
		buf, err := p.Marshal()
		require.NoError(t, err)
		require.NotPanics(t, func() {
			_, _ = q.AddPacket(buf)
		})
	}

	buff := make([]byte, MaxPktSize)

	// try to get old packets, but were valid before the bucket wrapped
	_, err := q.GetPacket(buff, 1)
	require.ErrorIs(t, err, ErrPacketTooOld)
	_, err = q.GetPacket(buff, 3)
	require.ErrorIs(t, err, ErrPacketTooOld)
	_, err = q.GetPacket(buff, 4)
	require.ErrorIs(t, err, ErrPacketTooOld)

	expectedSN := T(6)
	np := rtp.Packet{}
	i, err := q.GetPacket(buff, expectedSN)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN), np.SequenceNumber)

	// add an out-of-order packet and ensure it can be retrieved
	np2 := &rtp.Packet{
		Header: rtp.Header{
			SequenceNumber: 8,
		},
	}
	buf, err := np2.Marshal()
	require.NoError(t, err)
	_, err = q.AddPacket(buf)
	require.NoError(t, err)
	expectedSN = 8
	i, err = q.GetPacket(buff, expectedSN)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN), np.SequenceNumber)

	// add a packet with a large gap in sequence number which will invalidate all the slots
	np3 := &rtp.Packet{
		Header: rtp.Header{
			SequenceNumber: 56,
		},
	}
	buf, err = np3.Marshal()
	require.NoError(t, err)
	_, err = q.AddPacket(buf)
	require.NoError(t, err)
	expectedSN = 56
	i, err = q.GetPacket(buff, expectedSN)
	require.NoError(t, err)
	err = np.Unmarshal(buff[:i])
	require.NoError(t, err)
	require.Equal(t, uint16(expectedSN), np.SequenceNumber)

	// after the large jump invalidating all slots, retrieving previously added packets should fail
	_, err = q.GetPacket(buff, 6)
	require.ErrorIs(t, err, ErrPacketTooOld)
	_, err = q.GetPacket(buff, 7)
	require.ErrorIs(t, err, ErrPacketTooOld)
	_, err = q.GetPacket(buff, 8)
	require.ErrorIs(t, err, ErrPacketTooOld)
	_, err = q.GetPacket(buff, 10)
	require.ErrorIs(t, err, ErrPacketTooOld)
	_, err = q.GetPacket(buff, 13)
	require.ErrorIs(t, err, ErrPacketTooOld)
	_, err = q.GetPacket(buff, 15)
	require.ErrorIs(t, err, ErrPacketTooOld)
}

func TestQueueWrap(t *testing.T) {
	testQueueWrap(t, NewBucket[uint16](10))
	testQueueWrap(t, NewBucket[uint32](10))
	testQueueWrap(t, NewBucket[uint64](10))
}

func TestGrowingFullBucket(t *testing.T) {
	TestPackets := make([]*rtp.Packet, 8)
	for i := 0; i < 8; i++ {
		TestPackets[i] = &rtp.Packet{
			Header: rtp.Header{
				SequenceNumber: uint16(i),
			},
			Payload: []byte{byte(i)},
		}
	}

	bucket := NewBucket[uint16](4)

	for _, p := range TestPackets {
		buf, err := p.Marshal()
		require.NoError(t, err)
		_, err = bucket.AddPacket(buf)
		require.NoError(t, err)
	}

	for i := 7; i >= 4; i-- {
		_, err := bucket.GetPacket(make([]byte, MaxPktSize), uint16(i))
		require.NoError(t, err)
	}

	_, err := bucket.GetPacket(make([]byte, MaxPktSize), uint16(3))
	require.ErrorIs(t, err, ErrPacketTooOld)

	require.Equal(t, 8, bucket.Grow())
	require.Equal(t, 8, bucket.Capacity())

	NextTestPackets := make([]*rtp.Packet, 8)
	for i := 8; i < 16; i++ {
		NextTestPackets[i-8] = &rtp.Packet{
			Header: rtp.Header{
				SequenceNumber: uint16(i),
			},
			Payload: []byte{byte(i)},
		}
	}

	for _, p := range NextTestPackets {
		buf, err := p.Marshal()
		require.NoError(t, err)
		_, err = bucket.AddPacket(buf)
		require.NoError(t, err)
	}

	for i := 15; i >= 8; i-- {
		buf := make([]byte, MaxPktSize)
		_, err := bucket.GetPacket(buf, uint16(i))
		require.NoError(t, err)
	}
}

func TestQueueGrow(t *testing.T) {
	TestPackets := []*rtp.Packet{
		{
			Header: rtp.Header{
				SequenceNumber: 1,
			},
			Payload: []byte{1},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 3,
			},
			Payload: []byte{3},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 4,
			},
			Payload: []byte{4},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 6,
			},
			Payload: []byte{6},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 7,
			},
			Payload: []byte{7},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 10,
			},
			Payload: []byte{10},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 13,
			},
			Payload: []byte{13},
		},
		{
			Header: rtp.Header{
				SequenceNumber: 15,
			},
			Payload: []byte{15},
		},
	}

	q := NewBucket[uint16](10)

	for _, p := range TestPackets {
		buf, err := p.Marshal()
		require.NoError(t, err)
		require.NotPanics(t, func() {
			_, _ = q.AddPacket(buf)
		})
	}

	// seq1 is too old
	pbuf, _ := TestPackets[0].Marshal()
	_, err := q.AddPacket(pbuf)
	require.ErrorIs(t, err, ErrPacketTooOld)

	require.Equal(t, q.Grow(), 20)
	require.Equal(t, q.Capacity(), 20)

	// grow the bucket should not impact the existed packets
	buf := make([]byte, MaxPktSize)
	for _, sn := range []uint16{15, 13, 10, 7, 6} {
		i, err := q.GetPacket(buf, sn)
		require.NoError(t, err)
		require.Equal(t, 13, i)
		require.Equal(t, sn, uint16(buf[i-1]))
	}

	// too old packets before grow should not be found
	for _, sn := range []uint16{4, 3, 2, 1} {
		_, err := q.GetPacket(buf, sn)
		require.True(t, errors.Is(err, ErrPacketSizeInvalid) || errors.Is(err, ErrPacketMismatch))
	}

	// seq1 can be added and retrieved after grow
	_, err = q.AddPacket(pbuf)
	require.NoError(t, err)
	i, err := q.GetPacket(buf, 1)
	require.NoError(t, err)
	require.Equal(t, 13, i)
	require.EqualValues(t, 1, uint16(buf[i-1]))

	// add a packet with gap less than the growed capacity
	np := rtp.Packet{
		Header: rtp.Header{
			SequenceNumber: 34,
		},
	}
	pbuf, _ = np.Marshal()
	_, err = q.AddPacket(pbuf)
	require.NoError(t, err)
	for _, sn := range []uint16{34, 15} {
		_, err := q.GetPacket(buf, sn)
		require.NoError(t, err)
	}

	// add a packet with a large gap in sequence number which will invalidate all the slots
	np2 := &rtp.Packet{
		Header: rtp.Header{
			SequenceNumber: 156,
		},
	}
	pbuf, err = np2.Marshal()
	require.NoError(t, err)
	_, err = q.AddPacket(pbuf)
	require.NoError(t, err)
	_, err = q.GetPacket(buf, 156)
	require.NoError(t, err)

	for _, sn := range []uint16{34, 15} {
		_, err := q.GetPacket(buf, sn)
		require.ErrorIs(t, err, ErrPacketTooOld)
	}

	require.Equal(t, q.Grow(), 30)
	np3 := &rtp.Packet{
		Header: rtp.Header{
			SequenceNumber: 127,
		},
	}
	pbuf, err = np3.Marshal()
	require.NoError(t, err)
	_, err = q.AddPacket(pbuf)
	require.NoError(t, err)
	_, err = q.GetPacket(buf, 127)
	require.NoError(t, err)
}
