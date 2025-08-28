#!/usr/bin/env -S uv run --script
# /// script
# dependencies = [
#   "livekit",
#   "sounddevice",
#   "python-dotenv",
#   "asyncio",
#   "numpy",
# ]
# ///
import os
import logging
import asyncio
import argparse
import sys
import time
import threading
import select
import termios
import tty

from dotenv import load_dotenv
from signal import SIGINT, SIGTERM
from livekit import rtc
from livekit.rtc import apm
import sounddevice as sd
import numpy as np
from auth import generate_token
from list_devices import list_audio_devices

load_dotenv()
# ensure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are set in your .env file
LIVEKIT_URL = os.environ.get("LIVEKIT_URL")
ROOM_NAME = os.environ.get("ROOM_NAME")

SAMPLE_RATE = 48000  # 48kHz to match DC Microphone native rate
NUM_CHANNELS = 1
FRAME_SAMPLES = 480  # 10ms at 48kHz - required for APM
BLOCKSIZE = 4800  # 100ms buffer

# dB meter settings
MAX_AUDIO_BAR = 20 # 20 chars wide
INPUT_DB_MIN = -70.0
INPUT_DB_MAX = 0.0
FPS = 16

def _esc(*codes: int) -> str:
    return "\033[" + ";".join(str(c) for c in codes) + "m"

def _normalize_db(amplitude_db: float, db_min: float, db_max: float) -> float:
    amplitude_db = max(db_min, min(amplitude_db, db_max))
    return (amplitude_db - db_min) / (db_max - db_min)



class AudioStreamer:
    def __init__(self, enable_aec: bool = True, loop: asyncio.AbstractEventLoop = None):
        self.enable_aec = enable_aec
        self.running = True
        self.logger = logging.getLogger(__name__)
        self.loop = loop  # Store the event loop reference
        
        # Mute state
        self.is_muted = False
        self.mute_lock = threading.Lock()
        
        # Debug counters
        self.input_callback_count = 0
        self.output_callback_count = 0
        self.frames_processed = 0
        self.frames_sent_to_livekit = 0
        self.last_debug_time = time.time()
        
        # Audio I/O streams
        self.input_stream: sd.InputStream | None = None
        self.output_stream: sd.OutputStream | None = None
        
        # LiveKit components
        self.source = rtc.AudioSource(SAMPLE_RATE, NUM_CHANNELS)
        self.room: rtc.Room | None = None
        
        # Audio processing
        self.audio_processor: apm.AudioProcessingModule | None = None
        if enable_aec:
            self.logger.info("Initializing Audio Processing Module with Echo Cancellation")
            self.audio_processor = apm.AudioProcessingModule(
                echo_cancellation=True,
                noise_suppression=True,
                high_pass_filter=True,
                auto_gain_control=True
            )
        
        # Audio buffers and synchronization
        self.output_buffer = bytearray()
        self.output_lock = threading.Lock()
        self.audio_input_queue = asyncio.Queue(maxsize=100)  # Prevent memory buildup
        
        # Timing and delay tracking for AEC
        self.output_delay = 0.0
        self.input_delay = 0.0
        
        # dB meter
        self.micro_db = INPUT_DB_MIN
        self.input_device_name = "Microphone"
        
        # Participant tracking for dB meters
        self.participants = {}  # participant_id -> {'name': str, 'db_level': float, 'last_update': float}
        self.participants_lock = threading.Lock()
        
        # Control flags
        self.meter_running = True
        self.keyboard_thread = None
        
        # UI control - simple terminal meter only
        self.stdout_lock = threading.Lock()
        self.meter_line_reserved = False

        # Remote playback control: only play first subscribed remote audio track
        self.active_remote_participant_id: str | None = None
        self.remote_playback_enabled = True
        
    def start_audio_devices(self):
        """Initialize and start audio input/output devices"""
        try:
            self.logger.info("Starting audio devices...")
            
            # List all devices for debugging
            list_audio_devices()
            
            # Get device info - but override input device to use working microphone
            input_device, output_device = sd.default.device
            
            # Override to use DC Microphone (device 1) which is working
            #input_device = 1  # DC Microphone
            
            self.logger.info(f"Using input device: {input_device}, output device: {output_device}")
            
            if input_device is not None:
                device_info = sd.query_devices(input_device)
                if isinstance(device_info, dict):
                    self.input_device_name = device_info.get("name", "Microphone")
                    self.logger.info(f"Input device info: {device_info}")
                    
                    # Check if device supports our requirements
                    if device_info['max_input_channels'] < NUM_CHANNELS:
                        self.logger.warning(f"Input device only has {device_info['max_input_channels']} channels, need {NUM_CHANNELS}")
            
            self.logger.info(f"Creating input stream: rate={SAMPLE_RATE}, channels={NUM_CHANNELS}, blocksize={BLOCKSIZE}")
            
            # Start input stream
            self.input_stream = sd.InputStream(
                callback=self._input_callback,
                dtype="int16",
                channels=NUM_CHANNELS,
                device=input_device,
                samplerate=SAMPLE_RATE,
                blocksize=BLOCKSIZE,
            )
            self.input_stream.start()
            self.logger.info(f"Started audio input: {self.input_device_name}")
            
            # Start output stream  
            self.output_stream = sd.OutputStream(
                callback=self._output_callback,
                dtype="int16",
                channels=NUM_CHANNELS,
                device=output_device,
                samplerate=SAMPLE_RATE,
                blocksize=BLOCKSIZE,
            )
            self.output_stream.start()
            self.logger.info("Started audio output")
            
            # Test if streams are active
            time.sleep(0.1)  # Give streams time to start
            self.logger.info(f"Input stream active: {self.input_stream.active}")
            self.logger.info(f"Output stream active: {self.output_stream.active}")
            
        except Exception as e:
            self.logger.error(f"Failed to start audio devices: {e}")
            import traceback
            self.logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    def stop_audio_devices(self):
        """Stop and cleanup audio devices"""
        self.logger.info("Stopping audio devices...")
        self.meter_running = False
        
        if self.input_stream:
            self.input_stream.stop()
            self.input_stream.close()
            self.input_stream = None
            self.logger.info("Stopped input stream")
            
        if self.output_stream:
            self.output_stream.stop()
            self.output_stream.close()
            self.output_stream = None
            self.logger.info("Stopped output stream")
            
        self.logger.info("Audio devices stopped")
    
    def toggle_mute(self):
        """Toggle microphone mute state"""
        with self.mute_lock:
            self.is_muted = not self.is_muted
            status = "MUTED" if self.is_muted else "LIVE"
            self.logger.info(f"Microphone {status}")

    def start_keyboard_handler(self):
        """Start keyboard input handler in a separate thread"""
        def keyboard_handler():
            try:
                # Save original terminal settings
                old_settings = termios.tcgetattr(sys.stdin)
                tty.setraw(sys.stdin.fileno())
                
                while self.running:
                    if select.select([sys.stdin], [], [], 0.1)[0]:
                        key = sys.stdin.read(1)
                        if key.lower() == 'm':
                            self.toggle_mute()
                        elif key.lower() == 'q':
                            self.logger.info("Quit requested by user")
                            self.running = False
                            break
                        elif key == '\x03':  # Ctrl+C
                            break
                            
            except Exception as e:
                self.logger.error(f"Keyboard handler error: {e}")
            finally:
                # Restore terminal settings
                try:
                    termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
                except:
                    pass
        
        self.keyboard_thread = threading.Thread(target=keyboard_handler, daemon=True)
        self.keyboard_thread.start()
        self.logger.info("Keyboard handler started - Press 'm' to toggle mute, 'q' to quit")

    def stop_keyboard_handler(self):
        """Stop keyboard handler"""
        if self.keyboard_thread and self.keyboard_thread.is_alive():
            # Signal will be handled by the thread's loop
            pass

    def _input_callback(self, indata: np.ndarray, frame_count: int, time_info, status) -> None:
        """Sounddevice input callback - processes microphone audio"""
        self.input_callback_count += 1
        
        # Debug logging every few seconds
        current_time = time.time()
        if current_time - self.last_debug_time > 5.0:
            self.logger.info(f"Input callback stats: called {self.input_callback_count} times, "
                           f"processed {self.frames_processed} frames, "
                           f"sent {self.frames_sent_to_livekit} to LiveKit")
            self.last_debug_time = current_time
        
        if status:
            self.logger.warning(f"Input callback status: {status}")
            
        if not self.running:
            self.logger.debug("Input callback: not running, returning")
            return
            
        # Log first few callbacks for debugging
        if self.input_callback_count <= 5:
            self.logger.info(f"Input callback #{self.input_callback_count}: "
                           f"frame_count={frame_count}, "
                           f"indata.shape={indata.shape}, "
                           f"indata.dtype={indata.dtype}")
            self.logger.info(f"Audio level check - max: {np.max(np.abs(indata))}, "
                           f"mean: {np.mean(np.abs(indata)):.2f}")
            
        # Check mute state and apply if needed
        with self.mute_lock:
            is_muted = self.is_muted
        
        # If muted, replace audio data with silence but continue processing for meter
        processed_indata = indata.copy()
        if is_muted:
            processed_indata.fill(0)
            
        # Calculate delays for AEC
        self.input_delay = time_info.currentTime - time_info.inputBufferAdcTime
        total_delay = self.output_delay + self.input_delay
        
        if self.audio_processor:
            try:
                self.audio_processor.set_stream_delay_ms(int(total_delay * 1000))
            except RuntimeError as e:
                # Log the error but continue processing - this is a known issue with APM
                if not hasattr(self, '_delay_error_logged'):
                    self.logger.warning(f"Failed to set APM stream delay: {e}")
                    self.logger.warning("Continuing without delay compensation - audio quality may be affected")
                    self._delay_error_logged = True
        
        # Process audio in 10ms frames for AEC
        num_frames = frame_count // FRAME_SAMPLES
        
        if self.input_callback_count <= 3:
            self.logger.info(f"Processing {num_frames} frames of {FRAME_SAMPLES} samples each")
        
        for i in range(num_frames):
            start = i * FRAME_SAMPLES
            end = start + FRAME_SAMPLES
            if end > frame_count:
                break
                
            # Use original data for meter calculation, processed data for transmission
            original_chunk = indata[start:end, 0]  # For meter calculation
            capture_chunk = processed_indata[start:end, 0]  # For transmission (may be muted)
            
            # Create audio frame for AEC processing
            capture_frame = rtc.AudioFrame(
                data=capture_chunk.tobytes(),
                samples_per_channel=FRAME_SAMPLES,
                sample_rate=SAMPLE_RATE,
                num_channels=NUM_CHANNELS,
            )
            
            self.frames_processed += 1
            
            # Apply AEC if enabled
            if self.audio_processor:
                try:
                    self.audio_processor.process_stream(capture_frame)
                    if self.frames_processed <= 5:
                        self.logger.debug(f"Applied AEC to frame {self.frames_processed}")
                except Exception as e:
                    # Log the error but continue processing
                    if self.frames_processed <= 10:
                        self.logger.warning(f"Error processing audio stream with AEC: {e}")
                    # Only log this error for the first few frames to avoid spam
            
            # Calculate dB level for meter using original (unmuted) audio
            rms = np.sqrt(np.mean(original_chunk.astype(np.float32) ** 2))
            max_int16 = np.iinfo(np.int16).max
            self.micro_db = 20.0 * np.log10(rms / max_int16 + 1e-6)
            
            # Send to LiveKit using the stored event loop reference
            if self.loop and not self.loop.is_closed():
                try:
                    # Check queue size
                    queue_size = self.audio_input_queue.qsize()
                    if queue_size > 50:
                        self.logger.warning(f"Audio input queue getting full: {queue_size} items")
                    
                    # Use the stored loop reference instead of trying to get current loop
                    self.loop.call_soon_threadsafe(
                        self.audio_input_queue.put_nowait, capture_frame
                    )
                    self.frames_sent_to_livekit += 1
                    
                    if self.frames_sent_to_livekit <= 5:
                        self.logger.info(f"Sent frame {self.frames_sent_to_livekit} to LiveKit queue")
                        
                except Exception as e:
                    # Queue might be full or event loop might be closed
                    if self.frames_processed <= 10:
                        self.logger.warning(f"Failed to queue audio frame: {e}")
            else:
                if self.frames_processed <= 5:
                    self.logger.error("No valid event loop available for queuing audio frame")
    
    def _output_callback(self, outdata: np.ndarray, frame_count: int, time_info, status) -> None:
        """Sounddevice output callback - plays received audio"""
        self.output_callback_count += 1
        
        if status:
            self.logger.warning(f"Output callback status: {status}")
            
        # Log first few callbacks
        if self.output_callback_count <= 3:
            self.logger.info(f"Output callback #{self.output_callback_count}: "
                           f"frame_count={frame_count}, buffer_size={len(self.output_buffer)}")
        
        if not self.running:
            outdata.fill(0)
            return
            
        # Update output delay for AEC
        self.output_delay = time_info.outputBufferDacTime - time_info.currentTime
        
        # Fill output buffer from received audio
        with self.output_lock:
            bytes_needed = frame_count * 2  # 2 bytes per int16 sample
            if len(self.output_buffer) < bytes_needed:
                # Not enough data, fill what we have and zero the rest
                available_bytes = len(self.output_buffer)
                if available_bytes > 0:
                    outdata[:available_bytes // 2, 0] = np.frombuffer(
                        self.output_buffer[:available_bytes],
                        dtype=np.int16,
                        count=available_bytes // 2,
                    )
                    outdata[available_bytes // 2:, 0] = 0
                    del self.output_buffer[:available_bytes]
                else:
                    outdata.fill(0)
            else:
                # Enough data available
                chunk = self.output_buffer[:bytes_needed]
                outdata[:, 0] = np.frombuffer(chunk, dtype=np.int16, count=frame_count)
                del self.output_buffer[:bytes_needed]
        
        # Process output through AEC reverse stream
        if self.audio_processor:
            num_chunks = frame_count // FRAME_SAMPLES
            for i in range(num_chunks):
                start = i * FRAME_SAMPLES
                end = start + FRAME_SAMPLES
                if end > frame_count:
                    break
                    
                render_chunk = outdata[start:end, 0]
                render_frame = rtc.AudioFrame(
                    data=render_chunk.tobytes(),
                    samples_per_channel=FRAME_SAMPLES,
                    sample_rate=SAMPLE_RATE,
                    num_channels=NUM_CHANNELS,
                )
                try:
                    self.audio_processor.process_reverse_stream(render_frame)
                except Exception as e:
                    # Log the error but continue processing
                    if self.output_callback_count <= 10:
                        self.logger.warning(f"Error processing reverse stream with AEC: {e}")
                    # Only log this error for the first few callbacks to avoid spam
    
    def print_audio_meter(self):
        """Print dB meter with live/mute indicator"""
        if not self.meter_running:
            return
            
        # Use simple terminal interface
        self._print_simple_meter()
    
    def _print_simple_meter(self):
        """Original simple terminal meter display"""
        if not self.meter_running:
            return
        
        # Build a single compact line with all participants
        meter_parts = []
        
        # Compact status info - moved to beginning of line
        status_info = f"I:{self.input_callback_count} O:{self.output_callback_count} Q:{self.audio_input_queue.qsize()} P:{len(self.participants)} "
        
        # Local microphone meter
        amplitude_db = _normalize_db(self.micro_db, db_min=INPUT_DB_MIN, db_max=INPUT_DB_MAX)
        nb_bar = round(amplitude_db * MAX_AUDIO_BAR)
        
        color_code = 31 if amplitude_db > 0.75 else 33 if amplitude_db > 0.5 else 32
        bar = "#" * nb_bar + "-" * (MAX_AUDIO_BAR - nb_bar)
        
        # Add live/mute indicator
        with self.mute_lock:
            is_muted = self.is_muted
        
        if is_muted:
            live_indicator = f"{_esc(90)}●{_esc(0)} "  # Gray dot
        else:
            live_indicator = f"{_esc(1, 38, 2, 255, 0, 0)}●{_esc(0)} "   # Bright red dot
        
        # Local mic part
        local_part = f"{live_indicator}Mic[{self.micro_db:6.1f}]{_esc(color_code)}[{bar}]{_esc(0)}"
        meter_parts.append(local_part)
        
        # Add participant meters (compact format)
        current_time = time.time()
        with self.participants_lock:
            for participant_id, info in list(self.participants.items()):
                # Remove stale participants (no audio for 5 seconds)
                if current_time - info['last_update'] > 5.0:
                    del self.participants[participant_id]
                    continue
                
                # Calculate participant meter
                participant_amplitude_db = _normalize_db(info['db_level'], db_min=INPUT_DB_MIN, db_max=INPUT_DB_MAX)
                participant_nb_bar = round(participant_amplitude_db * (MAX_AUDIO_BAR // 2))  # Smaller bars for participants
                
                participant_color_code = 31 if participant_amplitude_db > 0.75 else 33 if participant_amplitude_db > 0.5 else 32
                participant_bar = "#" * participant_nb_bar + "-" * ((MAX_AUDIO_BAR // 2) - participant_nb_bar)
                
                participant_indicator = f"{_esc(94)}●{_esc(0)} "  # Blue dot for remote participants
                
                participant_part = f"{participant_indicator}{info['name'][:6]}[{info['db_level']:6.1f}]{_esc(participant_color_code)}[{participant_bar}]{_esc(0)}"
                meter_parts.append(participant_part)
        
        # Join status info at the beginning with all parts
        meter_text = status_info + " ".join(meter_parts)
        
        with self.stdout_lock:
            # Simple single-line update - clear line and rewrite
            sys.stdout.write(f"\033[2K\r\033[?25l{meter_text}")
            sys.stdout.flush()

    def init_terminal(self):
        """Initialize terminal for stable UI display"""
        with self.stdout_lock:
            # Hide cursor for cleaner display
            sys.stdout.write("\033[?25l")
            sys.stdout.flush()
            
    def restore_terminal(self):
        """Restore terminal to normal state"""
        with self.stdout_lock:
            # Clear the meter line and show cursor
            sys.stdout.write("\033[2K\r\033[?25h")
            sys.stdout.flush()

async def main(participant_name: str, enable_aec: bool = True):
    logger = logging.getLogger(__name__)
    logger.info("=== STARTING AUDIO STREAMER ===")
    
    # Get the running event loop
    loop = asyncio.get_running_loop()
    
    # Verify environment
    logger.info(f"LIVEKIT_URL: {LIVEKIT_URL}")
    logger.info(f"ROOM_NAME: {ROOM_NAME}")
    
    if not LIVEKIT_URL or not ROOM_NAME:
        logger.error("Missing LIVEKIT_URL or ROOM_NAME environment variables")
        return
    
    # Create audio streamer with loop reference
    streamer = AudioStreamer(enable_aec, loop=loop)
    
    # Create room
    room = rtc.Room(loop=loop)
    streamer.room = room
    
    # Audio processing task
    async def audio_processing_task():
        """Process audio frames from input queue and send to LiveKit"""
        frames_sent = 0
        logger.info("Audio processing task started")
        
        while streamer.running:
            try:
                # Get audio frame from input callback
                frame = await asyncio.wait_for(streamer.audio_input_queue.get(), timeout=1.0)
                await streamer.source.capture_frame(frame)
                frames_sent += 1
                
                if frames_sent <= 5:
                    logger.info(f"Sent frame {frames_sent} to LiveKit source")
                elif frames_sent % 100 == 0:
                    logger.info(f"Sent {frames_sent} frames total to LiveKit")
                    
            except asyncio.TimeoutError:
                logger.debug("No audio frames in queue (timeout)")
                continue
            except Exception as e:
                logger.error(f"Error in audio processing: {e}")
                break
        
        logger.info(f"Audio processing task ended. Total frames sent: {frames_sent}")
    
    # Meter display task
    async def meter_task():
        """Display audio level meter"""
        logger.info("Meter task started")
        while streamer.running and streamer.meter_running:
            streamer.print_audio_meter()
            await asyncio.sleep(1 / FPS)
        logger.info("Meter task ended")
    
    # Function to handle received audio frames
    async def receive_audio_frames(stream: rtc.AudioStream, participant: rtc.RemoteParticipant):
        frames_received = 0
        logger.info("Audio receive task started")
        
        # Use participant info passed from event handler
        participant_id = participant.sid
        participant_name = participant.identity or f"User_{participant.sid[:8]}"
        
        logger.info(f"Receiving audio from participant: {participant_name} ({participant_id})")
        
        async for frame_event in stream:
            if not streamer.running:
                break
                
            frames_received += 1
            if frames_received <= 5:
                logger.info(f"Received audio frame {frames_received} from {participant_name}")
            elif frames_received % 100 == 0:
                logger.info(f"Received {frames_received} frames total from {participant_name}")
                
            # Only process/play audio if this participant is the active remote track
            if streamer.active_remote_participant_id == participant_id and streamer.remote_playback_enabled:
                # Calculate dB level for this participant
                frame_data = frame_event.frame.data
                if len(frame_data) > 0:
                    # Convert to numpy array for dB calculation
                    audio_samples = np.frombuffer(frame_data, dtype=np.int16)
                    if len(audio_samples) > 0:
                        rms = np.sqrt(np.mean(audio_samples.astype(np.float32) ** 2))
                        max_int16 = np.iinfo(np.int16).max
                        participant_db = 20.0 * np.log10(rms / max_int16 + 1e-6)
                        
                        # Update participant info
                        with streamer.participants_lock:
                            streamer.participants[participant_id] = {
                                'name': participant_name,
                                'db_level': participant_db,
                                'last_update': time.time()
                            }
                
                # Add received audio to output buffer
                audio_data = frame_event.frame.data.tobytes()
                with streamer.output_lock:
                    streamer.output_buffer.extend(audio_data)
        
        logger.info(f"Audio receive task ended for {participant_name}. Total frames received: {frames_received}")
        
        # Clean up participant when stream ends
        with streamer.participants_lock:
            if participant_id in streamer.participants:
                del streamer.participants[participant_id]

    # Event handlers
    @room.on("track_subscribed")
    def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        logger.info("track subscribed: %s from participant %s (%s)", publication.sid, participant.sid, participant.identity)
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            # Only allow playback for the first subscribed remote audio track
            if streamer.active_remote_participant_id is None:
                streamer.active_remote_participant_id = participant.sid
                logger.info(f"Activating remote playback for first subscribed participant: {participant.identity}")
                audio_stream = rtc.AudioStream(track, sample_rate=SAMPLE_RATE, num_channels=NUM_CHANNELS)
                asyncio.ensure_future(receive_audio_frames(audio_stream, participant))
            else:
                logger.info(
                    f"Ignoring additional remote audio track from {participant.identity}; active playback is participant {streamer.active_remote_participant_id}"
                )

    @room.on("track_published")
    def on_track_published(
        publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant
    ):
        logger.info(
            "track published: %s from participant %s (%s)",
            publication.sid,
            participant.sid,
            participant.identity,
        )

    @room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        logger.info("participant connected: %s %s", participant.sid, participant.identity)
        # Initialize participant in our tracking
        with streamer.participants_lock:
            streamer.participants[participant.sid] = {
                'name': participant.identity or f"User_{participant.sid[:8]}",
                'db_level': INPUT_DB_MIN,
                'last_update': time.time()
            }
        logger.info(f"Added participant to tracking: {participant.identity}")

    @room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        logger.info("participant disconnected: %s %s", participant.sid, participant.identity)
        # Remove participant from our tracking
        with streamer.participants_lock:
            if participant.sid in streamer.participants:
                del streamer.participants[participant.sid]
                logger.info(f"Removed participant from tracking: {participant.identity}")
        # If the active remote track disconnected, clear active and flush output buffer
        if streamer.active_remote_participant_id == participant.sid:
            logger.info("Active remote participant disconnected; releasing playback and clearing buffer")
            streamer.active_remote_participant_id = None
            with streamer.output_lock:
                streamer.output_buffer.clear()

    @room.on("connected")
    def on_connected():
        logger.info("Successfully connected to LiveKit room")

    @room.on("disconnected")
    def on_disconnected(reason):
        logger.info(f"Disconnected from LiveKit room: {reason}")

    try:
        # Start audio devices
        logger.info("Starting audio devices...")
        streamer.start_audio_devices()
        
        # Start keyboard handler
        logger.info("Starting keyboard handler...")
        streamer.start_keyboard_handler()
        
        # Initialize terminal for stable UI
        streamer.init_terminal()
        
        # Connect to LiveKit room
        logger.info("Connecting to LiveKit room...")
        token = generate_token(ROOM_NAME, participant_name, participant_name)
        logger.info(f"Generated token for participant: {participant_name}")
        
        await room.connect(LIVEKIT_URL, token)
        logger.info("connected to room %s", room.name)
        
        # Publish microphone track
        logger.info("Publishing microphone track...")
        track = rtc.LocalAudioTrack.create_audio_track("mic", streamer.source)
        options = rtc.TrackPublishOptions()
        options.source = rtc.TrackSource.SOURCE_MICROPHONE
        publication = await room.local_participant.publish_track(track, options)
        logger.info("published track %s", publication.sid)
        
        if enable_aec:
            logger.info("Echo cancellation is enabled")
        else:
            logger.info("Echo cancellation is disabled")
        
        # Start background tasks
        logger.info("Starting background tasks...")
        audio_task = asyncio.create_task(audio_processing_task())
        meter_display_task = asyncio.create_task(meter_task())
        
        logger.info("=== Audio streaming started. Press Ctrl+C to stop. ===")
        
        # Keep running until interrupted
        try:
            while streamer.running:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            logger.info("Stopping audio streaming...")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
    finally:
        # Cleanup
        logger.info("Starting cleanup...")
        streamer.running = False
        
        if 'audio_task' in locals():
            audio_task.cancel()
            try:
                await audio_task
            except asyncio.CancelledError:
                pass
        
        if 'meter_display_task' in locals():
            meter_display_task.cancel()
            try:
                await meter_display_task
            except asyncio.CancelledError:
                pass
        
        streamer.stop_audio_devices()
        streamer.stop_keyboard_handler()
        await room.disconnect()
        
        # Clear the meter line
        streamer.restore_terminal()
        logger.info("=== CLEANUP COMPLETE ===")

if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="LiveKit bidirectional audio streaming with AEC")
    parser.add_argument(
        "--name", 
        "-n",
        type=str,
        default="audio-streamer",
        help="Participant name to use when connecting to the room (default: audio-streamer)"
    )
    parser.add_argument(
        "--disable-aec",
        action="store_true",
        help="Disable acoustic echo cancellation (AEC)"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging"
    )
    args = parser.parse_args()
    
    # Set up logging
    log_level = logging.DEBUG if args.debug else logging.INFO
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler("stream_audio.log"),
            # Only log to console in debug mode - otherwise interferes with meter
            *([logging.StreamHandler()] if args.debug else []),
        ],
    )
    
    # Also log to console with colors for easier debugging (only in debug mode)
    if args.debug:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        formatter = logging.Formatter('%(levelname)s: %(message)s')
        console_handler.setFormatter(formatter)
    
    # Fix deprecation warning by using asyncio.run() instead of get_event_loop()
    async def cleanup():
        task = asyncio.current_task()
        tasks = [t for t in asyncio.all_tasks() if t is not task]
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    def signal_handler():
        asyncio.create_task(cleanup())

    # Use asyncio.run() to properly handle the event loop
    try:
        # For signal handling, we need to use the lower-level approach
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        main_task = asyncio.ensure_future(main(args.name, enable_aec=not args.disable_aec))
        for signal in [SIGINT, SIGTERM]:
            loop.add_signal_handler(signal, signal_handler)

        try:
            loop.run_until_complete(main_task)
        except KeyboardInterrupt:
            pass
        finally:
            loop.close()
    except KeyboardInterrupt:
        pass 