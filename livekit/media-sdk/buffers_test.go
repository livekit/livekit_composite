package media

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFullFrames(t *testing.T) {
	var got []PCM16Sample
	w := FullFrames(NewPCM16FrameWriter(&got, 8000), 2)
	for _, f := range []PCM16Sample{
		{},
		{1}, {2},
		{3},
		{
			4,
			5, 6,
		},
		{7},
	} {
		err := w.WriteSample(f)
		require.NoError(t, err)
	}
	require.Equal(t, []PCM16Sample{
		{1, 2},
		{3, 4},
		{5, 6},
	}, got)

	err := w.Close()
	require.NoError(t, err)
	require.Equal(t, []PCM16Sample{
		{1, 2},
		{3, 4},
		{5, 6},
		{7},
	}, got)

	err = w.Close()
	require.NoError(t, err)
	require.Equal(t, []PCM16Sample{
		{1, 2},
		{3, 4},
		{5, 6},
		{7},
	}, got)
}
