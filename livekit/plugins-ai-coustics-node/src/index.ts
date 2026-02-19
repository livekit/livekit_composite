import "ref-napi";
import {
  AudioFrame,
  FrameProcessor,
  type FrameProcessorStreamInfo,
  type FrameProcessorCredentials,
} from "@livekit/rtc-node";

import {
  Enhancer,
  type StreamInfo,
  type Credentials,
  type NativeAudioBufferMut,
  type EnhancerSettings,
  type EnhancerModel,
  type VadSettings,
} from "./plugins-ai-coustics-uniffi-node";
import { log } from "./logger";

/** The maximum size of a i16 */
const MAX_SHORT_SIZE = 2 ** 15 - 1;

/** Converts a Float32Array into a pointer and length, so it can be passed to the native rust module */
function toNativeAudioBufferMut(samples: Float32Array): NativeAudioBufferMut {
  const samplesBuffer = Buffer.from(samples.buffer);
  const sampleLength = samples.length;

  const baseAddress = BigInt(samplesBuffer.address());

  return {
    ptr: baseAddress,
    len: BigInt(sampleLength), // NOTE: len is number of elements in array, NOT number of bytes!
  };
}

/** Attribute used to store associated VAD data (the return value of
 * https://docs.rs/aic-sdk/latest/aic_sdk/struct.Vad.html#method.is_speech_detected) from aic
 * model into processed `AudioFrame`s. */
export const FRAME_USERDATA_AIC_VAD_ATTRIBUTE = "lk.aic-vad";

type AiCousticsAudioEnhancerParams = {
  model?: EnhancerModel;
  vadSettings?: VadSettings;
};

class AiCousticsAudioEnhancer extends FrameProcessor<AudioFrame> {
  private model: EnhancerModel;
  private vadSettings: VadSettings;

  private enabled = true;
  private streamInfo: StreamInfo | null = null;
  private credentials: Credentials | null = null;
  private filterSettings: EnhancerSettings | null = null;
  private filter: Enhancer | null = null;

  constructor(params: AiCousticsAudioEnhancerParams = {}) {
    super();
    this.model = params.model ?? "quailL";
    this.vadSettings = params.vadSettings ?? {};
  }

  isEnabled(): boolean {
    return this.enabled;
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  onStreamInfoUpdated(info: FrameProcessorStreamInfo) {
    this.streamInfo = {
      roomId: "",
      roomName: info.roomName,
      participantIdentity: info.participantIdentity,
      participantId: "",
      trackId: info.publicationSid,
    };

    if (this.filter) {
      this.filter.updateStreamInfo(this.streamInfo!);
    }
  }

  onCredentialsUpdated(credentials: FrameProcessorCredentials) {
    this.credentials = credentials;
    if (this.filter) {
      this.filter.updateCredentials(this.credentials!);
    }
  }

  /**
   * Processes a single audio frame.
   *
   * If the frame processor is disabled or processing fails, the original frame is
   * returned unchanged.
   */
  process(frame: AudioFrame): AudioFrame {
    if (!this.isEnabled()) {
      return frame;
    }

    if (!this.credentials || !this.streamInfo) {
      log.error("Missing configuration");
      return frame;
    }

    // Lazily create filter
    if (
      !this.filter ||
      // implicitly recreate audio filter on sample rate or channel changes
      this.filterSettings?.sampleRate !== frame.sampleRate ||
      this.filterSettings?.numChannels !== frame.channels ||
      this.filterSettings?.samplesPerChannel !== frame.samplesPerChannel
    ) {
      this.filterSettings = {
        model: this.model,
        sampleRate: frame.sampleRate,
        numChannels: frame.channels,
        samplesPerChannel: frame.samplesPerChannel,
        credentials: this.credentials,
        vad: this.vadSettings,
      };

      this.teardownFilter();
      try {
        this.filter = new Enhancer(this.filterSettings);
      } catch (err) {
        log.error(`Init failed: ${err}`);
        this.filter = null;
        return frame;
      }
      this.filter.updateStreamInfo(this.streamInfo);
    }

    const frameDataI16: Int16Array = frame.data;
    const frameDataF32 = Float32Array.from(
      frameDataI16,
      (short) => short / MAX_SHORT_SIZE,
    );

    const nativeAudioBufferMut = toNativeAudioBufferMut(frameDataF32);

    let vadData: boolean;
    try {
      // NOTE: filter.process processes in place and modifies `frameDataF32`.
      vadData = this.filter.processWithVad(nativeAudioBufferMut);
    } catch (err) {
      log.error(`Processing failed: ${err}`);
      return frame;
    }

    const outputFrameDataI16 = Int16Array.from(
      frameDataF32,
      (float) => float * MAX_SHORT_SIZE,
    );

    const outputFrame = new AudioFrame(
      outputFrameDataI16,
      frame.sampleRate,
      frame.channels,
      frame.samplesPerChannel,
      frame.userdata,
    );

    outputFrame.userdata[FRAME_USERDATA_AIC_VAD_ATTRIBUTE] = vadData;
    return outputFrame;
  }

  private teardownFilter() {
    if (this.filter) {
      this.filter.uniffiDestroy();
      this.filter = null;
    }
  }

  close() {
    this.enabled = false;
    this.teardownFilter();
  }
}

// FIXME: copy this to some entrypoint file somwhere
export {
  type EnhancerModel,
  type VadSettings,
  type Credentials,
  type StreamInfo,
} from "./plugins-ai-coustics-uniffi-node";

export type AudioEnhancementParams = AiCousticsAudioEnhancerParams;

/**
 * Implements a mechanism to apply [ai-coustics models](https://ai-coustics.com/) on audio data
 * represented as {@link AudioFrame}s. In addition, each frame will be annotated with a
 * {@link FRAME_USERDATA_AIC_VAD_ATTRIBUTE } `userdata` attribute containing the output of the
 * aic vad model.
 */
export function audioEnhancement(params?: AudioEnhancementParams) {
  return new AiCousticsAudioEnhancer(params);
}
