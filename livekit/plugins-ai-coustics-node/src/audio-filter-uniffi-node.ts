import {
  type UniffiByteArray,
  type UniffiDuration,
  AbstractFfiConverterByteArray,
  FfiConverterInt8,
  FfiConverterInt16,
  FfiConverterInt32,
  FfiConverterInt64,
  FfiConverterFloat32,
  FfiConverterFloat64,
  FfiConverterUInt8,
  FfiConverterUInt16,
  FfiConverterUInt32,
  FfiConverterUInt64,
  FfiConverterBool,
  FfiConverterDuration,
  UniffiTimestamp,
  FfiConverterTimestamp,
  FfiConverterOptional,
  FfiConverterArray,
  FfiConverterMap,
  FfiConverterArrayBuffer,
  FfiConverterObject,
  RustBuffer,
  UniffiError,
  UniffiInternalError,
  type UniffiRustCaller,
  type UniffiRustCallStatus,
  UniffiAbstractObject,
  UniffiRustArcPtr,
  UnsafeMutableRawPointer,
  UniffiObjectFactory,
  uniffiCreateFfiConverterString,
  uniffiCreateRecord,
  uniffiRustCallAsync,
  uniffiTypeNameSymbol,
  variantOrdinalSymbol,
  destructorGuardSymbol,
  pointerLiteralSymbol,
} from "uniffi-bindgen-react-native";

import {
  DataType,
  type JsExternal,
  open /* close, */,
  define,
  load,
  arrayConstructor,
  funcConstructor,
  restorePointer,
  wrapPointer,
  unwrapPointer,
  createPointer,
  freePointer,
  isNullPointer,
  PointerType,
  type FieldType,
} from "ffi-rs";

import FFI_DYNAMIC_LIB, {
  uniffiCaller,
  FfiConverterString,
  type UniffiRustBufferStruct,
  type UniffiForeignBytes,
  UniffiRustBufferValue,
  type UniffiRustCallStatusStruct,
  type UniffiCallbackRustFutureContinuationCallback,
  type UniffiCallbackForeignFutureDroppedCallback,
  type UniffiCallbackCallbackInterfaceFree,
  type UniffiCallbackCallbackInterfaceClone,
  type UniffiForeignFutureDroppedCallbackStruct,
  type UniffiForeignFutureResultU8,
  type UniffiCallbackForeignFutureCompleteU8,
  type UniffiForeignFutureResultI8,
  type UniffiCallbackForeignFutureCompleteI8,
  type UniffiForeignFutureResultU16,
  type UniffiCallbackForeignFutureCompleteU16,
  type UniffiForeignFutureResultI16,
  type UniffiCallbackForeignFutureCompleteI16,
  type UniffiForeignFutureResultU32,
  type UniffiCallbackForeignFutureCompleteU32,
  type UniffiForeignFutureResultI32,
  type UniffiCallbackForeignFutureCompleteI32,
  type UniffiForeignFutureResultU64,
  type UniffiCallbackForeignFutureCompleteU64,
  type UniffiForeignFutureResultI64,
  type UniffiCallbackForeignFutureCompleteI64,
  type UniffiForeignFutureResultF32,
  type UniffiCallbackForeignFutureCompleteF32,
  type UniffiForeignFutureResultF64,
  type UniffiCallbackForeignFutureCompleteF64,
  type UniffiForeignFutureResultRustBuffer,
  type UniffiCallbackForeignFutureCompleteRustBuffer,
  type UniffiForeignFutureResultVoid,
  type UniffiCallbackForeignFutureCompleteVoid,
} from "./audio-filter-uniffi-sys";

// ==========
// Record definitions:
// ==========

export type AudioFilterCredentials = { url: string; token: string };

export const AudioFilterCredentials = (() => {
  const defaults = () => ({}); // FIXME: add defaults here!
  const create = (() => {
    return uniffiCreateRecord<
      AudioFilterCredentials,
      ReturnType<typeof defaults>
    >(defaults);
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link AudioFilterCredentials}, with defaults specified
     * in Rust, in the {@link audio_filter_uniffi} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link AudioFilterCredentials}, with defaults specified
     * in Rust, in the {@link audio_filter_uniffi} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link audio_filter_uniffi} crate.
     */
    defaults: () =>
      Object.freeze(defaults()) as Partial<AudioFilterCredentials>,
  });
})();

const FfiConverterTypeAudioFilterCredentials = (() => {
  type TypeName = AudioFilterCredentials;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        url: FfiConverterString.read(from),
        token: FfiConverterString.read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      FfiConverterString.write(value.url, into);
      FfiConverterString.write(value.token, into);
    }
    allocationSize(value: TypeName): number {
      return (
        FfiConverterString.allocationSize(value.url) +
        FfiConverterString.allocationSize(value.token)
      );
    }
  }
  return new FFIConverter();
})();

export type AudioFilterSettings = {
  sampleRate: /*u32*/ number;
  numChannels: /*u16*/ number;
  samplesPerChannel: /*u32*/ number;
  credentials: AudioFilterCredentials;
  model: AudioFilterModel;
  vad: VadSettings;
};

export const AudioFilterSettings = (() => {
  const defaults = () => ({}); // FIXME: add defaults here!
  const create = (() => {
    return uniffiCreateRecord<AudioFilterSettings, ReturnType<typeof defaults>>(
      defaults,
    );
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link AudioFilterSettings}, with defaults specified
     * in Rust, in the {@link audio_filter_uniffi} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link AudioFilterSettings}, with defaults specified
     * in Rust, in the {@link audio_filter_uniffi} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link audio_filter_uniffi} crate.
     */
    defaults: () => Object.freeze(defaults()) as Partial<AudioFilterSettings>,
  });
})();

const FfiConverterTypeAudioFilterSettings = (() => {
  type TypeName = AudioFilterSettings;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        sampleRate: FfiConverterUInt32.read(from),
        numChannels: FfiConverterUInt16.read(from),
        samplesPerChannel: FfiConverterUInt32.read(from),
        credentials: FfiConverterTypeAudioFilterCredentials.read(from),
        model: FfiConverterTypeAudioFilterModel.read(from),
        vad: FfiConverterTypeVadSettings.read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      FfiConverterUInt32.write(value.sampleRate, into);
      FfiConverterUInt16.write(value.numChannels, into);
      FfiConverterUInt32.write(value.samplesPerChannel, into);
      FfiConverterTypeAudioFilterCredentials.write(value.credentials, into);
      FfiConverterTypeAudioFilterModel.write(value.model, into);
      FfiConverterTypeVadSettings.write(value.vad, into);
    }
    allocationSize(value: TypeName): number {
      return (
        FfiConverterUInt32.allocationSize(value.sampleRate) +
        FfiConverterUInt16.allocationSize(value.numChannels) +
        FfiConverterUInt32.allocationSize(value.samplesPerChannel) +
        FfiConverterTypeAudioFilterCredentials.allocationSize(
          value.credentials,
        ) +
        FfiConverterTypeAudioFilterModel.allocationSize(value.model) +
        FfiConverterTypeVadSettings.allocationSize(value.vad)
      );
    }
  }
  return new FFIConverter();
})();

/**
 * A buffer owned by and whose lifetime is managed by the foreign language.
 */
export type NativeAudioBufferMut = { ptr: /*u64*/ bigint; len: /*u64*/ bigint };

export const NativeAudioBufferMut = (() => {
  const defaults = () => ({}); // FIXME: add defaults here!
  const create = (() => {
    return uniffiCreateRecord<
      NativeAudioBufferMut,
      ReturnType<typeof defaults>
    >(defaults);
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link NativeAudioBufferMut}, with defaults specified
     * in Rust, in the {@link audio_filter_uniffi} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link NativeAudioBufferMut}, with defaults specified
     * in Rust, in the {@link audio_filter_uniffi} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link audio_filter_uniffi} crate.
     */
    defaults: () => Object.freeze(defaults()) as Partial<NativeAudioBufferMut>,
  });
})();

const FfiConverterTypeNativeAudioBufferMut = (() => {
  type TypeName = NativeAudioBufferMut;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        ptr: FfiConverterUInt64.read(from),
        len: FfiConverterUInt64.read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      FfiConverterUInt64.write(value.ptr, into);
      FfiConverterUInt64.write(value.len, into);
    }
    allocationSize(value: TypeName): number {
      return (
        FfiConverterUInt64.allocationSize(value.ptr) +
        FfiConverterUInt64.allocationSize(value.len)
      );
    }
  }
  return new FFIConverter();
})();

export type StreamInfo = {
  roomId: string;
  roomName: string;
  participantIdentity: string;
  participantId: string;
  trackId: string;
};

export const StreamInfo = (() => {
  const defaults = () => ({}); // FIXME: add defaults here!
  const create = (() => {
    return uniffiCreateRecord<StreamInfo, ReturnType<typeof defaults>>(
      defaults,
    );
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link StreamInfo}, with defaults specified
     * in Rust, in the {@link audio_filter_uniffi} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link StreamInfo}, with defaults specified
     * in Rust, in the {@link audio_filter_uniffi} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link audio_filter_uniffi} crate.
     */
    defaults: () => Object.freeze(defaults()) as Partial<StreamInfo>,
  });
})();

const FfiConverterTypeStreamInfo = (() => {
  type TypeName = StreamInfo;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        roomId: FfiConverterString.read(from),
        roomName: FfiConverterString.read(from),
        participantIdentity: FfiConverterString.read(from),
        participantId: FfiConverterString.read(from),
        trackId: FfiConverterString.read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      FfiConverterString.write(value.roomId, into);
      FfiConverterString.write(value.roomName, into);
      FfiConverterString.write(value.participantIdentity, into);
      FfiConverterString.write(value.participantId, into);
      FfiConverterString.write(value.trackId, into);
    }
    allocationSize(value: TypeName): number {
      return (
        FfiConverterString.allocationSize(value.roomId) +
        FfiConverterString.allocationSize(value.roomName) +
        FfiConverterString.allocationSize(value.participantIdentity) +
        FfiConverterString.allocationSize(value.participantId) +
        FfiConverterString.allocationSize(value.trackId)
      );
    }
  }
  return new FFIConverter();
})();

export type VadSettings = {
  lookbackBufferSize?: /*f32*/ number;
  sensitivity?: /*f32*/ number;
};

export const VadSettings = (() => {
  const defaults = () => ({}); // FIXME: add defaults here!
  const create = (() => {
    return uniffiCreateRecord<VadSettings, ReturnType<typeof defaults>>(
      defaults,
    );
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link VadSettings}, with defaults specified
     * in Rust, in the {@link audio_filter_uniffi} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link VadSettings}, with defaults specified
     * in Rust, in the {@link audio_filter_uniffi} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link audio_filter_uniffi} crate.
     */
    defaults: () => Object.freeze(defaults()) as Partial<VadSettings>,
  });
})();

const FfiConverterTypeVadSettings = (() => {
  type TypeName = VadSettings;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        lookbackBufferSize: new FfiConverterOptional(FfiConverterFloat32).read(
          from,
        ),
        sensitivity: new FfiConverterOptional(FfiConverterFloat32).read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      new FfiConverterOptional(FfiConverterFloat32).write(
        value.lookbackBufferSize,
        into,
      );
      new FfiConverterOptional(FfiConverterFloat32).write(
        value.sensitivity,
        into,
      );
    }
    allocationSize(value: TypeName): number {
      return (
        new FfiConverterOptional(FfiConverterFloat32).allocationSize(
          value.lookbackBufferSize,
        ) +
        new FfiConverterOptional(FfiConverterFloat32).allocationSize(
          value.sensitivity,
        )
      );
    }
  }
  return new FFIConverter();
})();

// ==========
// Enum definitions:
// ==========

export type AudioFilterError = "model" | "authorization";

export const FfiConverterTypeAudioFilterError = (() => {
  const ordinalConverter = FfiConverterInt32;
  class FFIConverter extends AbstractFfiConverterByteArray<AudioFilterError> {
    read(from: RustBuffer): AudioFilterError {
      switch (ordinalConverter.read(from)) {
        case 1:
          return "model";
        case 2:
          return "authorization";
        default:
          throw new UniffiInternalError.UnexpectedEnumCase();
      }
    }
    write(value: AudioFilterError, into: RustBuffer): void {
      switch (value) {
        case "model":
          ordinalConverter.write(1, into);
          break;
        case "authorization":
          ordinalConverter.write(2, into);
          break;
        default:
          throw new UniffiInternalError.UnexpectedEnumCase();
      }
    }
    allocationSize(value: AudioFilterError): number {
      return ordinalConverter.allocationSize(0);
    }
  }
  return new FFIConverter();
})();

export type AudioFilterModel = "quailStt" | "quailS" | "quailL";

export const FfiConverterTypeAudioFilterModel = (() => {
  const ordinalConverter = FfiConverterInt32;
  class FFIConverter extends AbstractFfiConverterByteArray<AudioFilterModel> {
    read(from: RustBuffer): AudioFilterModel {
      switch (ordinalConverter.read(from)) {
        case 1:
          return "quailStt";
        case 2:
          return "quailS";
        case 3:
          return "quailL";
        default:
          throw new UniffiInternalError.UnexpectedEnumCase();
      }
    }
    write(value: AudioFilterModel, into: RustBuffer): void {
      switch (value) {
        case "quailStt":
          ordinalConverter.write(1, into);
          break;
        case "quailS":
          ordinalConverter.write(2, into);
          break;
        case "quailL":
          ordinalConverter.write(3, into);
          break;
        default:
          throw new UniffiInternalError.UnexpectedEnumCase();
      }
    }
    allocationSize(value: AudioFilterModel): number {
      return ordinalConverter.allocationSize(0);
    }
  }
  return new FFIConverter();
})();

// ==========
// Object definitions:
// ==========

export type AudioFilterInterface = {
  /**
   * Process an interleaved, 10ms frame.
   */ process(frame: NativeAudioBufferMut): void;

  /**
   * Process a planar, 10ms frame.
   */ processPlanar(channels: Array<NativeAudioBufferMut>): void;

  /**
   * Process an interleaved, 10ms frame. Returns vad information alongside the mutated frame.
   */ processWithVad(frame: NativeAudioBufferMut): boolean;

  /**
 * Update credentials for model authorization.
 *
 * The model must always hold a set of valid credentials for continued operation.

 */ updateCredentials(credentials: AudioFilterCredentials): void;

  /**
   * Report information about the current audio stream being processed.
   */ updateStreamInfo(info: StreamInfo): void;
};

export class AudioFilter
  extends UniffiAbstractObject
  implements AudioFilterInterface
{
  readonly [uniffiTypeNameSymbol] = "AudioFilter";
  readonly [destructorGuardSymbol]: UniffiRustArcPtr;
  readonly [pointerLiteralSymbol]: UnsafeMutableRawPointer;

  // Constructors:

  /**
 * Creates a new audio filter with the provided settings.
 *
 * If provided settings are invalid or model use cannot be authorized,
 * the result is an error.

 */
  constructor(settings: AudioFilterSettings) {
    super();

    let settingsArg = UniffiRustBufferValue.allocateWithBytes(
      FfiConverterTypeAudioFilterSettings.lower(settings),
    ).toStruct();
    const pointer = uniffiCaller.rustCall(
      /*caller:*/ (callStatus) => {
        return FFI_DYNAMIC_LIB.uniffi_audio_filter_uniffi_fn_constructor_audiofilter_new(
          [settingsArg, callStatus],
        );
      },
      /*liftString:*/ FfiConverterString.lift,
    );

    this[pointerLiteralSymbol] = pointer;
    this[destructorGuardSymbol] =
      uniffiTypeAudioFilterObjectFactory.bless(pointer);
  } // Methods:

  /**
   * Process an interleaved, 10ms frame.
   */ process(frame: NativeAudioBufferMut): void {
    /* Regular function call: */
    uniffiCaller.rustCallWithError(
      /*liftError:*/ (buffer) => [
        "AudioFilterError",
        FfiConverterTypeAudioFilterError.lift(buffer),
      ],
      /*caller:*/ (callStatus) => {
        let frameArg = UniffiRustBufferValue.allocateWithBytes(
          FfiConverterTypeNativeAudioBufferMut.lower(frame),
        ).toStruct();

        const returnValue =
          FFI_DYNAMIC_LIB.uniffi_audio_filter_uniffi_fn_method_audiofilter_process(
            [
              uniffiTypeAudioFilterObjectFactory.clonePointer(this),
              frameArg,
              callStatus,
            ],
          );

        return returnValue;
      },
      /*liftString:*/ FfiConverterString.lift,
    );
  }

  /**
   * Process a planar, 10ms frame.
   */ processPlanar(channels: Array<NativeAudioBufferMut>): void {
    /* Regular function call: */
    uniffiCaller.rustCallWithError(
      /*liftError:*/ (buffer) => [
        "AudioFilterError",
        FfiConverterTypeAudioFilterError.lift(buffer),
      ],
      /*caller:*/ (callStatus) => {
        let channelsArg = UniffiRustBufferValue.allocateWithBytes(
          new FfiConverterArray(FfiConverterTypeNativeAudioBufferMut).lower(
            channels,
          ),
        ).toStruct();

        const returnValue =
          FFI_DYNAMIC_LIB.uniffi_audio_filter_uniffi_fn_method_audiofilter_process_planar(
            [
              uniffiTypeAudioFilterObjectFactory.clonePointer(this),
              channelsArg,
              callStatus,
            ],
          );

        return returnValue;
      },
      /*liftString:*/ FfiConverterString.lift,
    );
  }

  /**
   * Process an interleaved, 10ms frame. Returns vad information alongside the mutated frame.
   */ processWithVad(frame: NativeAudioBufferMut): boolean {
    /* Regular function call: */
    const returnValue = uniffiCaller.rustCallWithError(
      /*liftError:*/ (buffer) => [
        "AudioFilterError",
        FfiConverterTypeAudioFilterError.lift(buffer),
      ],
      /*caller:*/ (callStatus) => {
        let frameArg = UniffiRustBufferValue.allocateWithBytes(
          FfiConverterTypeNativeAudioBufferMut.lower(frame),
        ).toStruct();

        const returnValue =
          FFI_DYNAMIC_LIB.uniffi_audio_filter_uniffi_fn_method_audiofilter_process_with_vad(
            [
              uniffiTypeAudioFilterObjectFactory.clonePointer(this),
              frameArg,
              callStatus,
            ],
          );

        return returnValue;
      },
      /*liftString:*/ FfiConverterString.lift,
    );

    return FfiConverterBool.lift(returnValue);
  }

  /**
 * Update credentials for model authorization.
 *
 * The model must always hold a set of valid credentials for continued operation.

 */ updateCredentials(credentials: AudioFilterCredentials): void {
    /* Regular function call: */
    uniffiCaller.rustCallWithError(
      /*liftError:*/ (buffer) => [
        "AudioFilterError",
        FfiConverterTypeAudioFilterError.lift(buffer),
      ],
      /*caller:*/ (callStatus) => {
        let credentialsArg = UniffiRustBufferValue.allocateWithBytes(
          FfiConverterTypeAudioFilterCredentials.lower(credentials),
        ).toStruct();

        const returnValue =
          FFI_DYNAMIC_LIB.uniffi_audio_filter_uniffi_fn_method_audiofilter_update_credentials(
            [
              uniffiTypeAudioFilterObjectFactory.clonePointer(this),
              credentialsArg,
              callStatus,
            ],
          );

        return returnValue;
      },
      /*liftString:*/ FfiConverterString.lift,
    );
  }

  /**
   * Report information about the current audio stream being processed.
   */ updateStreamInfo(info: StreamInfo): void {
    /* Regular function call: */
    uniffiCaller.rustCall(
      /*caller:*/ (callStatus) => {
        let infoArg = UniffiRustBufferValue.allocateWithBytes(
          FfiConverterTypeStreamInfo.lower(info),
        ).toStruct();

        const returnValue =
          FFI_DYNAMIC_LIB.uniffi_audio_filter_uniffi_fn_method_audiofilter_update_stream_info(
            [
              uniffiTypeAudioFilterObjectFactory.clonePointer(this),
              infoArg,
              callStatus,
            ],
          );

        return returnValue;
      },
      /*liftString:*/ FfiConverterString.lift,
    );
  }

  /**
   * {@inheritDoc uniffi-bindgen-react-native#UniffiAbstractObject.uniffiDestroy}
   */
  uniffiDestroy(): void {
    const ptr = (this as any)[destructorGuardSymbol];
    if (typeof ptr !== "undefined") {
      const pointer = uniffiTypeAudioFilterObjectFactory.pointer(this);
      uniffiTypeAudioFilterObjectFactory.freePointer(pointer);
      uniffiTypeAudioFilterObjectFactory.unbless(ptr);
      delete (this as any)[destructorGuardSymbol];
    }
  }
  [Symbol.dispose] = this.uniffiDestroy;

  static instanceOf(obj: any): obj is AudioFilter {
    return uniffiTypeAudioFilterObjectFactory.isConcreteType(obj);
  }

  // FIXME: maybe add `.equal(a, b)` static method like many protobuf libraries have?
  // FIXME: maybe add `.clone()` method?
}

const uniffiTypeAudioFilterObjectFactory: UniffiObjectFactory<AudioFilter> =
  (() => {
    /// <reference lib="es2021" />
    const registry =
      typeof (globalThis as any).FinalizationRegistry !== "undefined"
        ? new (globalThis as any).FinalizationRegistry(
            (heldValue: UnsafeMutableRawPointer) => {
              uniffiTypeAudioFilterObjectFactory.freePointer(heldValue);
            },
          )
        : null;

    return {
      create(pointer: UnsafeMutableRawPointer): AudioFilter {
        const instance = Object.create(AudioFilter.prototype);
        instance[pointerLiteralSymbol] = pointer;
        instance[destructorGuardSymbol] = this.bless(pointer);
        instance[uniffiTypeNameSymbol] = "AudioFilter";
        return instance;
      },

      bless(p: UnsafeMutableRawPointer): UniffiRustArcPtr {
        const ptr = {
          p, // make sure this object doesn't get optimized away.
          markDestroyed: () => undefined,
        };
        if (registry) {
          registry.register(ptr, p, ptr);
        }
        return ptr;
      },

      unbless(ptr: UniffiRustArcPtr) {
        if (registry) {
          registry.unregister(ptr);
        }
      },

      pointer(obj: AudioFilter): UnsafeMutableRawPointer {
        if (typeof (obj as any)[destructorGuardSymbol] === "undefined") {
          throw new UniffiInternalError.UnexpectedNullPointer();
        }
        return (obj as any)[pointerLiteralSymbol];
      },

      clonePointer(obj: AudioFilter): UnsafeMutableRawPointer {
        const handleArg = this.pointer(obj);
        return uniffiCaller.rustCall(
          /*caller:*/ (callStatus) => {
            return FFI_DYNAMIC_LIB.uniffi_audio_filter_uniffi_fn_clone_audiofilter(
              [handleArg, callStatus],
            );
          },
          /*liftString:*/ FfiConverterString.lift,
        );
      },

      freePointer(handleArg: UnsafeMutableRawPointer): void {
        uniffiCaller.rustCall(
          /*caller:*/ (callStatus) => {
            return FFI_DYNAMIC_LIB.uniffi_audio_filter_uniffi_fn_free_audiofilter(
              [handleArg, callStatus],
            );
          },
          /*liftString:*/ FfiConverterString.lift,
        );
      },

      isConcreteType(obj: any): obj is AudioFilter {
        return (
          obj[destructorGuardSymbol] &&
          obj[uniffiTypeNameSymbol] === "AudioFilter"
        );
      },
    };
  })();

// FfiConverter for TodoListInterface
const FfiConverterTypeAudioFilter = new FfiConverterObject(
  uniffiTypeAudioFilterObjectFactory,
);

// ==========
// Function definitions:
// ==========
