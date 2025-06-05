import wave
import numpy as np
import asyncio
from pathlib import Path
from livekit import rtc


class WavPlayer:
    def __init__(self):
        self._wav_cache = {}
        self._audio_track = None
        self._audio_source = None
        self._samples_per_channel = 9600

    async def initialize_track(self, room: rtc.Room) -> None:
        """Initialize the audio track and source if they don't exist."""
        if self._audio_track is None:
            self._audio_source = rtc.AudioSource(48000, 1)
            self._audio_track = rtc.LocalAudioTrack.create_audio_track("wav_audio", self._audio_source)
            
            # Publish the track
            await room.local_participant.publish_track(
                self._audio_track,
                rtc.TrackPublishOptions(
                    source=rtc.TrackSource.SOURCE_MICROPHONE,
                    stream="wav_audio"
                )
            )
            
            # Small delay to ensure track is established
            await asyncio.sleep(0.5)

    async def play_once(self, wav_path: str | Path, room: rtc.Room, volume: float = 0.3) -> None:
        """
        Play a WAV file once through a LiveKit audio track.
        
        Args:
            wav_path: Path to the WAV file
            room: LiveKit room instance
            volume: Volume level (0.0 to 1.0)
        """
        wav_path = Path(wav_path).resolve()  # Convert to absolute path
        
        if not wav_path.exists():
            raise FileNotFoundError(f"WAV file not found: {wav_path}")
        
        try:
            await self.initialize_track(room)
            
            # Use cached audio data if available
            if str(wav_path) not in self._wav_cache:
                with wave.open(str(wav_path), 'rb') as wav_file:
                    audio_data = wav_file.readframes(wav_file.getnframes())
                    audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)
                    
                    if wav_file.getnchannels() == 2:
                        audio_array = audio_array.reshape(-1, 2).mean(axis=1)
                    
                    self._wav_cache[str(wav_path)] = audio_array
            
            audio_array = self._wav_cache[str(wav_path)]
            
            for i in range(0, len(audio_array), self._samples_per_channel):
                chunk = audio_array[i:i + self._samples_per_channel]
                
                if len(chunk) < self._samples_per_channel:
                    chunk = np.pad(chunk, (0, self._samples_per_channel - len(chunk)))
                
                chunk = np.tanh(chunk / 32768.0) * 32768.0
                chunk = np.round(chunk * volume).astype(np.int16)
                
                await self._audio_source.capture_frame(rtc.AudioFrame(
                    data=chunk.tobytes(),
                    sample_rate=48000,
                    samples_per_channel=self._samples_per_channel,
                    num_channels=1
                ))
                
                await asyncio.sleep((self._samples_per_channel / 48000) * 0.98)
                
        except Exception as e:
            await self.cleanup(room)
            raise e

    async def cleanup(self, room: rtc.Room) -> None:
        """Clean up audio resources."""
        if self._audio_track:
            await room.local_participant.unpublish_track(self._audio_track)
        if self._audio_source:
            self._audio_source.close()
        self._audio_track = None
        self._audio_source = None 