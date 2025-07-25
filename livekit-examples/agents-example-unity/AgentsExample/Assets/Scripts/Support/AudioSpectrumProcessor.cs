using System.Collections;
using System.Linq;
using UnityEngine;

namespace AgentsExample
{
    public class AudioSpectrumProcessor
    {
        private float[] _spectrum;
        private float[] _bins;
        private float[] _finalBins;

        public AudioSpectrumProcessor(int bins)
        {
            _spectrum = new float[SAMPLE_SIZE];
            _bins = new float[bins];
            _finalBins = new float[bins];
        }

        public float[] Output => _finalBins;

        public void UpdateFrom(AudioSource audioSource)
        {
            audioSource.GetSpectrumData(_spectrum, 0, FFTWindow.BlackmanHarris);
            ProcessSpectrum();
        }

        private void ProcessSpectrum()
        {
            var max = 0f;
            for (int i = 0; i < _bins.Length; i++)
            {
                var logStart = Mathf.Pow((float)i / _bins.Length, 2) * _spectrum.Length;
                var logEnd = Mathf.Pow((float)(i + 1) / _bins.Length, 2) * _spectrum.Length;

                var start = Mathf.Clamp(Mathf.FloorToInt(logStart), 0, _spectrum.Length - 1);
                var end = Mathf.Clamp(Mathf.FloorToInt(logEnd), 0, _spectrum.Length - 1);
                var count = end - start + 1;

                float average = 0f;
                for (int j = start; j <= end; j++)
                    average += _spectrum[j];
                average /= count;

                _bins[i] = average;
                max = Mathf.Max(max, _bins[i]);
            }

            for (int i = 0; i < _bins.Length; i++)
            {
                if (max <= SILENT_THRESHOLD)
                {
                    _finalBins[i] *= DECAY_RATE_SILENT;
                    continue;
                }
                float normalizedValue = _bins[i] / max;

                if (normalizedValue > _finalBins[i])
                    _finalBins[i] = normalizedValue;
                else
                    _finalBins[i] *= DECAY_RATE;

                float sum = _finalBins[i];
                float count = 1f;

                if (i > 0)
                {
                    sum += _finalBins[i - 1] * NEIGHBOR_SMOOTHING;
                    count += NEIGHBOR_SMOOTHING;
                }

                if (i < _bins.Length - 1)
                {
                    sum += _finalBins[i + 1] * NEIGHBOR_SMOOTHING;
                    count += NEIGHBOR_SMOOTHING;
                }

                _finalBins[i] = sum / count;
            }
        }

        private const int SAMPLE_SIZE = 1024;
        private const float DECAY_RATE = 0.98f;
        private const float DECAY_RATE_SILENT = 0.85f;
        private const float NEIGHBOR_SMOOTHING = 0.25f;
        private const float SILENT_THRESHOLD = 0.0001f;
    }
}