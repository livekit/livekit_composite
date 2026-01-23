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
	pktSizeLimit = 256 * 1024

	RTPMaxPktSize   = 1500
	RTPSeqNumOffset = 2
)

type number interface {
	uint16 | uint32 | uint64
}

type Bucket[ET number, T number] struct {
	maxPktSize   int
	seqNumOffset int

	pktSizeHeader  int
	invalidPktSize uint64
	putSize        func(buf []byte, value uint64)
	getSize        func(buf []byte) uint64
	putSeqNum      func(buf []byte, value uint64)
	getSeqNum      func(buf []byte) uint64

	halfRange          ET
	slots              [][]byte
	init               bool
	resyncOnNextPacket bool
	step               int
	headSN             ET
	initCapacity       int
	maxSteps           int
}

func NewBucket[ET number, T number](capacity int, maxPktSize int, seqNumOffset int) *Bucket[ET, T] {
	if maxPktSize > pktSizeLimit {
		return nil
	}

	var et ET
	b := &Bucket[ET, T]{
		maxPktSize:   maxPktSize,
		seqNumOffset: seqNumOffset,
		halfRange:    1 << ((unsafe.Sizeof(et) * 8) - 1),
		initCapacity: capacity,
		maxSteps:     capacity,
	}

	switch {
	case maxPktSize < 256:
		b.pktSizeHeader = 1
		b.invalidPktSize = uint64(0xff)
		b.putSize = put8
		b.getSize = get8

	case maxPktSize < 65536:
		b.pktSizeHeader = 2
		b.invalidPktSize = uint64(0xffff)
		b.putSize = put16
		b.getSize = get16

	default:
		b.pktSizeHeader = 4
		b.invalidPktSize = uint64(0xffffffff)
		b.putSize = put32
		b.getSize = get32
	}

	var t T
	switch unsafe.Sizeof(t) {
	case 1:
		b.putSeqNum = put8
		b.getSeqNum = get8

	case 2:
		b.putSeqNum = put16
		b.getSeqNum = get16

	case 4:
		b.putSeqNum = put32
		b.getSeqNum = get32

	default:
		b.putSeqNum = put64
		b.getSeqNum = get64
	}

	b.slots = b.createSlots()
	return b
}

// Grow increases the capacity of the bucket by adding initial capacity to the buffer
func (b *Bucket[ET, T]) Grow() int {
	newSlots := b.createSlots()
	growedSlots := append(b.slots, newSlots...)
	// move wrapped slots to new slots
	for i := b.maxSteps - 1; i >= b.step; i-- {
		if b.getSize(b.slots[i]) != b.invalidPktSize {
			growedSlots[i+b.initCapacity], growedSlots[i] = growedSlots[i], growedSlots[i+b.initCapacity]
		}
	}
	b.slots = growedSlots
	b.maxSteps += b.initCapacity
	return b.maxSteps
}

func (b *Bucket[ET, T]) ResyncOnNextPacket() {
	b.resyncOnNextPacket = true
}

func (b *Bucket[ET, T]) HeadSequenceNumber() ET {
	return b.headSN
}

func (b *Bucket[ET, T]) Capacity() int {
	return b.maxSteps
}

func (b *Bucket[ET, T]) addPacket(pkt []byte, sn ET) ([]byte, error) {
	if len(pkt) > b.maxPktSize-b.pktSizeHeader {
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

func (b *Bucket[ET, T]) AddPacket(pkt []byte) ([]byte, error) {
	return b.addPacket(pkt, ET(b.getSeqNum(pkt[b.seqNumOffset:])))
}

func (b *Bucket[ET, T]) AddPacketWithSequenceNumber(pkt []byte, sn ET) ([]byte, error) {
	storedPkt, err := b.addPacket(pkt, sn)
	if err != nil {
		return nil, err
	}

	// overwrite sequence number in packet
	b.putSeqNum(storedPkt[b.seqNumOffset:], uint64(sn))
	return storedPkt, nil
}

func (b *Bucket[ET, T]) GetPacket(buf []byte, sn ET) (int, error) {
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

func (b *Bucket[ET, T]) push(sn ET, diff int, pkt []byte) ([]byte, error) {
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

func (b *Bucket[ET, T]) get(sn ET, diff int) ([]byte, error) {
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
	sz := b.getSize(slot)
	if sz == b.invalidPktSize {
		return nil, fmt.Errorf("%w, headSN %d, sn %d, size %d", ErrPacketSizeInvalid, b.headSN, sn, sz)
	}

	if cacheSN := b.getSeqNum(slot[b.pktSizeHeader+b.seqNumOffset:]); T(cacheSN) != T(sn) {
		return nil, fmt.Errorf("%w, headSN %d, sn %d, cacheSN %d", ErrPacketMismatch, b.headSN, sn, cacheSN)
	}

	return slot[b.pktSizeHeader : b.pktSizeHeader+int(sz)], nil
}

func (b *Bucket[ET, T]) set(sn ET, diff int, pkt []byte) ([]byte, error) {
	if diff >= b.maxSteps {
		return nil, fmt.Errorf("%w, headSN %d, sn %d", ErrPacketTooOld, b.headSN, sn)
	}

	idx := b.wrap(b.step - diff - 1)
	slot := b.slots[idx]
	size := b.getSize(slot)
	if size != b.invalidPktSize {
		// Do not overwrite if duplicate
		if int(size) != len(pkt) {
			return nil, fmt.Errorf("%w, incorrect RTX size, expected %d, actual %d", ErrRTXPacketSize, size, len(pkt))
		}

		storedSN := b.getSeqNum(slot[b.pktSizeHeader+b.seqNumOffset:])
		if T(storedSN) == T(sn) {
			return nil, ErrRTXPacket
		}

		// packet is valid, but has a different sequence number
		return nil, fmt.Errorf("%w, expected %d, actual: %d", ErrPacketMismatch, storedSN, sn)
	}

	return b.store(idx, pkt), nil
}

func (b *Bucket[ET, T]) store(idx int, pkt []byte) []byte {
	// store packet size
	slot := b.slots[idx]
	b.putSize(slot, uint64(len(pkt)))

	// store packet
	copy(slot[b.pktSizeHeader:], pkt)

	return slot[b.pktSizeHeader : b.pktSizeHeader+len(pkt)]
}

func (b *Bucket[ET, T]) wrap(slot int) int {
	for slot < 0 {
		slot += b.maxSteps
	}

	for slot >= b.maxSteps {
		slot -= b.maxSteps
	}

	return slot
}

func (b *Bucket[ET, T]) invalidate(startSlot int, numSlots int) {
	if numSlots > b.maxSteps {
		numSlots = b.maxSteps
	}

	for i := range numSlots {
		idx := b.wrap(startSlot + i)
		b.putSize(b.slots[idx], b.invalidPktSize)
	}
}

func (b *Bucket[ET, T]) createSlots() [][]byte {
	pktSize := b.maxPktSize + b.pktSizeHeader
	buf := make([]byte, pktSize*b.initCapacity)
	slots := make([][]byte, b.initCapacity)
	for i := range b.initCapacity {
		slots[i] = buf[i*pktSize : (i+1)*pktSize]
		b.putSize(slots[i], b.invalidPktSize)
	}
	return slots
}

// -------------------------------------------------------------

func put8(buf []byte, value uint64) {
	buf[0] = uint8(value)
}

func get8(buf []byte) uint64 {
	return uint64(buf[0])
}

func put16(buf []byte, value uint64) {
	binary.BigEndian.PutUint16(buf, uint16(value))
}

func get16(buf []byte) uint64 {
	return uint64(binary.BigEndian.Uint16(buf))
}

func put32(buf []byte, value uint64) {
	binary.BigEndian.PutUint32(buf, uint32(value))
}

func get32(buf []byte) uint64 {
	return uint64(binary.BigEndian.Uint32(buf))
}

func put64(buf []byte, value uint64) {
	binary.BigEndian.PutUint64(buf, value)
}

func get64(buf []byte) uint64 {
	return binary.BigEndian.Uint64(buf)
}
