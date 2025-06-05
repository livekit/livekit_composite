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
	"fmt"
	"unsafe"
)

const (
	MaxPktSize     = 1500
	pktSizeHeader  = 2
	seqNumOffset   = 2
	seqNumSize     = 2
	invalidPktSize = uint16(65535)
)

type number interface {
	uint16 | uint32 | uint64
}

type Bucket[T number] struct {
	halfRange          T
	slots              [][]byte
	init               bool
	resyncOnNextPacket bool
	step               int
	headSN             T
	initCapacity       int
	maxSteps           int
}

func NewBucket[T number](capacity int) *Bucket[T] {
	var t T
	b := &Bucket[T]{
		halfRange:    1 << ((unsafe.Sizeof(t) * 8) - 1),
		initCapacity: capacity,
		maxSteps:     capacity,
	}

	b.slots = createSlots(capacity)
	return b
}

// Grow increases the capacity of the bucket by adding initial capacity to the buffer
func (b *Bucket[T]) Grow() int {
	newSlots := createSlots(b.initCapacity)
	growedSlots := append(b.slots, newSlots...)
	// move wrapped slots to new slots
	for i := b.maxSteps - 1; i >= b.step; i-- {
		if binary.BigEndian.Uint16(b.slots[i]) != invalidPktSize {
			growedSlots[i+b.initCapacity], growedSlots[i] = growedSlots[i], growedSlots[i+b.initCapacity]
		}
	}
	b.slots = growedSlots
	b.maxSteps += b.initCapacity
	return b.maxSteps
}

func (b *Bucket[T]) ResyncOnNextPacket() {
	b.resyncOnNextPacket = true
}

func (b *Bucket[T]) HeadSequenceNumber() T {
	return b.headSN
}

func (b *Bucket[T]) Capacity() int {
	return b.maxSteps
}

func (b *Bucket[T]) addPacket(pkt []byte, sn T) ([]byte, error) {
	if len(pkt) > MaxPktSize-pktSizeHeader {
		return nil, ErrPacketTooLarge
	}

	if !b.init {
		b.headSN = sn - 1
		b.init = true
	}

	if b.resyncOnNextPacket {
		b.resyncOnNextPacket = false

		b.headSN = sn - 1
		b.invalidate(0, b.maxSteps)
	}

	diff := sn - b.headSN
	if diff == 0 || diff > b.halfRange {
		// duplicate of last packet or out-of-order
		return b.set(sn, int(b.headSN-sn), pkt)
	}

	return b.push(sn, int(diff)-1, pkt)
}

func (b *Bucket[T]) AddPacket(pkt []byte) ([]byte, error) {
	return b.addPacket(pkt, T(binary.BigEndian.Uint16(pkt[seqNumOffset:seqNumOffset+seqNumSize])))
}

func (b *Bucket[T]) AddPacketWithSequenceNumber(pkt []byte, sn T) ([]byte, error) {
	storedPkt, err := b.addPacket(pkt, sn)
	if err != nil {
		return nil, err
	}

	// overwrite sequence number in packet
	binary.BigEndian.PutUint16(storedPkt[seqNumOffset:seqNumOffset+seqNumSize], uint16(sn))
	return storedPkt, nil
}

func (b *Bucket[T]) GetPacket(buf []byte, sn T) (int, error) {
	if b == nil {
		return 0, ErrNoBucket
	}

	var (
		p   []byte
		err error
	)

	diff := b.headSN - sn
	if diff > b.halfRange {
		diff = sn - b.headSN
		p, err = b.get(sn, -int(diff))
	} else {
		p, err = b.get(sn, int(diff))
	}
	if err != nil {
		return 0, err
	}
	n := len(p)
	if cap(buf) < n {
		return 0, ErrBufferTooSmall
	}
	if len(buf) < n {
		buf = buf[:n]
	}
	copy(buf, p)
	return n, nil
}

func (b *Bucket[T]) push(sn T, diff int, pkt []byte) ([]byte, error) {
	b.headSN = sn

	// invalidate slots if there is a gap in the sequence number
	b.invalidate(b.step, diff)

	// store headSN packet
	idx := b.wrap(b.step + diff)
	storedPkt := b.store(idx, pkt)

	// for next packet
	b.step = b.wrap(b.step + diff + 1)

	return storedPkt, nil
}

func (b *Bucket[T]) get(sn T, diff int) ([]byte, error) {
	if diff < 0 {
		// asking for something ahead of headSN
		return nil, fmt.Errorf("%w, headSN %d, sn %d", ErrPacketTooNew, b.headSN, sn)
	}
	if diff >= b.maxSteps {
		// too old
		return nil, fmt.Errorf("%w, headSN %d, sn %d", ErrPacketTooOld, b.headSN, sn)
	}

	idx := b.wrap(b.step - diff - 1)
	slot := b.slots[idx]
	sz := binary.BigEndian.Uint16(slot)
	if sz == invalidPktSize {
		return nil, fmt.Errorf("%w, headSN %d, sn %d, size %d", ErrPacketSizeInvalid, b.headSN, sn, sz)
	}

	cacheSN := binary.BigEndian.Uint16(slot[pktSizeHeader+seqNumOffset:])
	if cacheSN != uint16(sn) {
		return nil, fmt.Errorf("%w, headSN %d, sn %d, cacheSN %d", ErrPacketMismatch, b.headSN, sn, cacheSN)
	}

	return slot[pktSizeHeader : pktSizeHeader+int(sz)], nil
}

func (b *Bucket[T]) set(sn T, diff int, pkt []byte) ([]byte, error) {
	if diff >= b.maxSteps {
		return nil, fmt.Errorf("%w, headSN %d, sn %d", ErrPacketTooOld, b.headSN, sn)
	}

	idx := b.wrap(b.step - diff - 1)
	slot := b.slots[idx]
	size := binary.BigEndian.Uint16(slot)
	if size != invalidPktSize {
		// Do not overwrite if duplicate
		if int(size) != len(pkt) {
			return nil, fmt.Errorf("%w, incorrect RTX size, expected %d, actual %d", ErrRTXPacketSize, size, len(pkt))
		}

		storedSN := binary.BigEndian.Uint16(slot[pktSizeHeader+seqNumOffset:])
		if storedSN == uint16(sn) {
			return nil, ErrRTXPacket
		}

		// packet is valid, but has a different sequence number
		return nil, fmt.Errorf("%w, expected %d, actual: %d", ErrPacketMismatch, storedSN, sn)
	}

	return b.store(idx, pkt), nil
}

func (b *Bucket[T]) store(idx int, pkt []byte) []byte {
	// store packet size
	slot := b.slots[idx]
	binary.BigEndian.PutUint16(slot, uint16(len(pkt)))

	// store packet
	copy(slot[pktSizeHeader:], pkt)

	return slot[pktSizeHeader : pktSizeHeader+len(pkt)]
}

func (b *Bucket[T]) wrap(slot int) int {
	for slot < 0 {
		slot += b.maxSteps
	}

	for slot >= b.maxSteps {
		slot -= b.maxSteps
	}

	return slot
}

func (b *Bucket[T]) invalidate(startSlot int, numSlots int) {
	if numSlots > b.maxSteps {
		numSlots = b.maxSteps
	}

	for i := 0; i < numSlots; i++ {
		idx := b.wrap(startSlot + i)
		binary.BigEndian.PutUint16(b.slots[idx], invalidPktSize)
	}
}

// -------------------------------------------------------------

func createSlots(capacity int) [][]byte {
	pktSize := MaxPktSize + pktSizeHeader
	buf := make([]byte, pktSize*capacity)
	slots := make([][]byte, capacity)
	for i := 0; i < capacity; i++ {
		slots[i] = buf[i*pktSize : (i+1)*pktSize]
		binary.BigEndian.PutUint16(slots[i], invalidPktSize)
	}
	return slots
}
