package media

import (
	"errors"
	"fmt"
	"slices"
	"sync"
)

type sample interface {
	int8 | int16 | int32 | int64 | float32 | float64
}

// FullFrames creates a writer that only writes full frames of a given size to the underlying writer (except the last one).
func FullFrames[T ~[]S, S sample](w WriteCloser[T], frameSize int) WriteCloser[T] {
	if frameSize <= 0 {
		panic("invalid frame size")
	}
	return &frameBuffer[T, S]{
		w:         w,
		frameSize: frameSize,
		buf:       make([]S, 0, frameSize),
	}
}

type frameBuffer[T ~[]S, S sample] struct {
	frameSize int
	mu        sync.Mutex
	w         WriteCloser[T]
	buf       []S
}

func (b *frameBuffer[T, S]) String() string {
	return fmt.Sprintf("FrameBuf(%d) -> %s", b.frameSize, b.w)
}
func (b *frameBuffer[T, S]) SampleRate() int {
	return b.w.SampleRate()
}

func (b *frameBuffer[T, S]) WriteSample(in T) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.buf = append(b.buf, in...)
	return b.flush(false)
}

func (b *frameBuffer[T, S]) flush(force bool) error {
	it := b.buf
	defer func() {
		if len(it) == 0 {
			b.buf = b.buf[:0]
		} else if dn := len(b.buf) - len(it); dn > 0 {
			b.buf = slices.Delete(b.buf, 0, dn)
		}
	}()
	for len(it)/b.frameSize > 0 {
		frame := it[:b.frameSize]
		it = it[len(frame):]
		if err := b.w.WriteSample(frame); err != nil {
			return err
		}
	}
	if force && len(it) > 0 {
		if err := b.w.WriteSample(it); err != nil {
			return err
		}
		it = nil
	}
	return nil
}

func (b *frameBuffer[T, S]) Close() error {
	b.mu.Lock()
	defer b.mu.Unlock()
	err := b.flush(true)
	err2 := b.w.Close()
	return errors.Join(err, err2)
}
