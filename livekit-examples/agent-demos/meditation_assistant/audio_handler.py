import asyncio
import numpy as np
import wave
from pathlib import Path
from livekit import rtc

# A lot of this code could be refactored now that we have the WavPlayer extension,
# but leaving it as is for now to match the original implementation shared on social.

class AudioHandler:
    def __init__(self, sample_rate=48000, channels=1):
        self.audio_source = rtc.AudioSource(sample_rate, channels)
        self.audio_track = rtc.LocalAudioTrack.create_audio_track("background_audio", self.audio_source)
        self.audio_task = None
        self.audio_running = asyncio.Event()
        self.fade_out = False
        
    async def start_audio(self, wav_path: Path | str, volume: float = 0.3):
        self.audio_running.set()
        self.fade_out = False
        self.audio_task = asyncio.create_task(self._play_audio(wav_path, volume))
        
    async def stop_audio(self):
        self.fade_out = True
        await asyncio.sleep(5.2)
        self.audio_running.clear()
        if self.audio_task:
            await self.audio_task
            self.audio_task = None
            
    async def _play_audio(self, wav_path: Path | str, volume: float):
        samples_per_channel = 9600
        wav_path = Path(wav_path)
        fade_start_time = None
        
        while self.audio_running.is_set():
            with wave.open(str(wav_path), 'rb') as wav_file:
                sample_rate = wav_file.getframerate()
                num_channels = wav_file.getnchannels()
                
                audio_data = wav_file.readframes(wav_file.getnframes())
                audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)
                
                if num_channels == 2:
                    audio_array = audio_array.reshape(-1, 2).mean(axis=1)
                
                for i in range(0, len(audio_array), samples_per_channel):
                    if not self.audio_running.is_set():
                        break
                    
                    chunk = audio_array[i:i + samples_per_channel]
                    
                    if len(chunk) < samples_per_channel:
                        chunk = np.pad(chunk, (0, samples_per_channel - len(chunk)))
                    
                    if self.fade_out:
                        if fade_start_time is None:
                            fade_start_time = asyncio.get_event_loop().time()
                        
                        elapsed_fade_time = asyncio.get_event_loop().time() - fade_start_time
                        if elapsed_fade_time >= 5.0:
                            break
                        
                        fade_factor = max(0.0, 1.0 - (elapsed_fade_time / 5.0))
                        volume = volume * fade_factor
                    
                    chunk = np.tanh(chunk / 32768.0) * 32768.0
                    chunk = np.round(chunk * volume).astype(np.int16)
                    
                    await self.audio_source.capture_frame(rtc.AudioFrame(
                        data=chunk.tobytes(),
                        sample_rate=48000,
                        samples_per_channel=samples_per_channel,
                        num_channels=1
                    ))
                    
                    await asyncio.sleep((samples_per_channel / 48000) * 0.98)
    
    async def publish_track(self, room):
        await room.local_participant.publish_track(
            self.audio_track,
            rtc.TrackPublishOptions(
                source=rtc.TrackSource.SOURCE_MICROPHONE,
                stream="background_audio"
            )
        ) 