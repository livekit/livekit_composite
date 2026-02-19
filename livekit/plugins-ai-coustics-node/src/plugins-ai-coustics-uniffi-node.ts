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
} from "./plugins-ai-coustics-uniffi-sys";

// ==========
// Record definitions:
// ==========

export type Credentials = { url: string; token: string };

export const Credentials = (() => {
  const defaults = () => ({}); // FIXME: add defaults here!
  const create = (() => {
    return uniffiCreateRecord<Credentials, ReturnType<typeof defaults>>(
      defaults,
    );
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link Credentials}, with defaults specified
     * in Rust, in the {@link plugins_ai_coustics_uniffi} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link Credentials}, with defaults specified
     * in Rust, in the {@link plugins_ai_coustics_uniffi} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link plugins_ai_coustics_uniffi} crate.
     */
    defaults: () => Object.freeze(defaults()) as Partial<Credentials>,
  });
})();

const FfiConverterTypeCredentials = (() => {
  type TypeName = Credentials;
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

export type EnhancerSettings = {
  sampleRate: /*u32*/ number;
  numChannels: /*u16*/ number;
  samplesPerChannel: /*u32*/ number;
  credentials: Credentials;
  model: EnhancerModel;
  vad: VadSettings;
};

export const EnhancerSettings = (() => {
  const defaults = () => ({}); // FIXME: add defaults here!
  const create = (() => {
    return uniffiCreateRecord<EnhancerSettings, ReturnType<typeof defaults>>(
      defaults,
    );
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link EnhancerSettings}, with defaults specified
     * in Rust, in the {@link plugins_ai_coustics_uniffi} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link EnhancerSettings}, with defaults specified
     * in Rust, in the {@link plugins_ai_coustics_uniffi} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link plugins_ai_coustics_uniffi} crate.
     */
    defaults: () => Object.freeze(defaults()) as Partial<EnhancerSettings>,
  });
})();

const FfiConverterTypeEnhancerSettings = (() => {
  type TypeName = EnhancerSettings;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        sampleRate: FfiConverterUInt32.read(from),
        numChannels: FfiConverterUInt16.read(from),
        samplesPerChannel: FfiConverterUInt32.read(from),
        credentials: FfiConverterTypeCredentials.read(from),
        model: FfiConverterTypeEnhancerModel.read(from),
        vad: FfiConverterTypeVadSettings.read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      FfiConverterUInt32.write(value.sampleRate, into);
      FfiConverterUInt16.write(value.numChannels, into);
      FfiConverterUInt32.write(value.samplesPerChannel, into);
      FfiConverterTypeCredentials.write(value.credentials, into);
      FfiConverterTypeEnhancerModel.write(value.model, into);
      FfiConverterTypeVadSettings.write(value.vad, into);
    }
    allocationSize(value: TypeName): number {
      return (
        FfiConverterUInt32.allocationSize(value.sampleRate) +
        FfiConverterUInt16.allocationSize(value.numChannels) +
        FfiConverterUInt32.allocationSize(value.samplesPerChannel) +
        FfiConverterTypeCredentials.allocationSize(value.credentials) +
        FfiConverterTypeEnhancerModel.allocationSize(value.model) +
        FfiConverterTypeVadSettings.allocationSize(value.vad)
      );
    }
  }
  return new FFIConverter();
})();

/**
 * A buffer owned by and whose lifetime is managed by the foreign language.
 */
export type NativeAudioBufferMut = {
  /**
   * Pointer to the buffer.
   */ ptr: /*u64*/ bigint;
  /**
   * Number of bytes in the buffer.
   */ len: /*u64*/ bigint;
};

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
     * in Rust, in the {@link plugins_ai_coustics_uniffi} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link NativeAudioBufferMut}, with defaults specified
     * in Rust, in the {@link plugins_ai_coustics_uniffi} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link plugins_ai_coustics_uniffi} crate.
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
     * in Rust, in the {@link plugins_ai_coustics_uniffi} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link StreamInfo}, with defaults specified
     * in Rust, in the {@link plugins_ai_coustics_uniffi} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link plugins_ai_coustics_uniffi} crate.
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
  speechHoldDuration?: /*f32*/ number;
  sensitivity?: /*f32*/ number;
  minimumSpeechDuration?: /*f32*/ number;
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
     * in Rust, in the {@link plugins_ai_coustics_uniffi} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link VadSettings}, with defaults specified
     * in Rust, in the {@link plugins_ai_coustics_uniffi} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link plugins_ai_coustics_uniffi} crate.
     */
    defaults: () => Object.freeze(defaults()) as Partial<VadSettings>,
  });
})();

const FfiConverterTypeVadSettings = (() => {
  type TypeName = VadSettings;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        speechHoldDuration: new FfiConverterOptional(FfiConverterFloat32).read(
          from,
        ),
        sensitivity: new FfiConverterOptional(FfiConverterFloat32).read(from),
        minimumSpeechDuration: new FfiConverterOptional(
          FfiConverterFloat32,
        ).read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      new FfiConverterOptional(FfiConverterFloat32).write(
        value.speechHoldDuration,
        into,
      );
      new FfiConverterOptional(FfiConverterFloat32).write(
        value.sensitivity,
        into,
      );
      new FfiConverterOptional(FfiConverterFloat32).write(
        value.minimumSpeechDuration,
        into,
      );
    }
    allocationSize(value: TypeName): number {
      return (
        new FfiConverterOptional(FfiConverterFloat32).allocationSize(
          value.speechHoldDuration,
        ) +
        new FfiConverterOptional(FfiConverterFloat32).allocationSize(
          value.sensitivity,
        ) +
        new FfiConverterOptional(FfiConverterFloat32).allocationSize(
          value.minimumSpeechDuration,
        )
      );
    }
  }
  return new FFIConverter();
})();

// ==========
// Enum definitions:
// ==========

export type EnhancerError = "model" | "authorization";

export const FfiConverterTypeEnhancerError = (() => {
  const ordinalConverter = FfiConverterInt32;
  class FFIConverter extends AbstractFfiConverterByteArray<EnhancerError> {
    read(from: RustBuffer): EnhancerError {
      switch (ordinalConverter.read(from)) {
        case 1:
          return "model";
        case 2:
          return "authorization";
        default:
          throw new UniffiInternalError.UnexpectedEnumCase();
      }
    }
    write(value: EnhancerError, into: RustBuffer): void {
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
    allocationSize(value: EnhancerError): number {
      return ordinalConverter.allocationSize(0);
    }
  }
  return new FFIConverter();
})();

export type EnhancerModel = "quailL" | "quailVfL" | "sparrowS";

export const FfiConverterTypeEnhancerModel = (() => {
  const ordinalConverter = FfiConverterInt32;
  class FFIConverter extends AbstractFfiConverterByteArray<EnhancerModel> {
    read(from: RustBuffer): EnhancerModel {
      switch (ordinalConverter.read(from)) {
        case 1:
          return "quailL";
        case 2:
          return "quailVfL";
        case 3:
          return "sparrowS";
        default:
          throw new UniffiInternalError.UnexpectedEnumCase();
      }
    }
    write(value: EnhancerModel, into: RustBuffer): void {
      switch (value) {
        case "quailL":
          ordinalConverter.write(1, into);
          break;
        case "quailVfL":
          ordinalConverter.write(2, into);
          break;
        case "sparrowS":
          ordinalConverter.write(3, into);
          break;
        default:
          throw new UniffiInternalError.UnexpectedEnumCase();
      }
    }
    allocationSize(value: EnhancerModel): number {
      return ordinalConverter.allocationSize(0);
    }
  }
  return new FFIConverter();
})();

// ==========
// Object definitions:
// ==========

export type EnhancerInterface = {
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

 */ updateCredentials(credentials: Credentials): void;

  /**
   * Report information about the current audio stream being processed.
   */ updateStreamInfo(info: StreamInfo): void;
};

/**
 * Ai-coustics audio enhancer.
 */
export class Enhancer
  extends UniffiAbstractObject
  implements EnhancerInterface
{
  readonly [uniffiTypeNameSymbol] = "Enhancer";
  readonly [destructorGuardSymbol]: UniffiRustArcPtr;
  readonly [pointerLiteralSymbol]: UnsafeMutableRawPointer;

  // Constructors:

  /**
 * Creates a new audio filter with the provided settings.
 *
 * If provided settings are invalid or model use cannot be authorized,
 * the result is an error.

 */
  constructor(settings: EnhancerSettings) {
    super();

    let settingsArg = UniffiRustBufferValue.allocateWithBytes(
      FfiConverterTypeEnhancerSettings.lower(settings),
    ).toStruct();
    const pointer = uniffiCaller.rustCallWithError(
      /*liftError:*/ (buffer) => [
        "EnhancerError",
        FfiConverterTypeEnhancerError.lift(buffer),
      ],
      /*caller:*/ (callStatus) => {
        return FFI_DYNAMIC_LIB.uniffi_plugins_ai_coustics_uniffi_fn_constructor_enhancer_new(
          [settingsArg, callStatus],
        );
      },
      /*liftString:*/ FfiConverterString.lift,
    );

    this[pointerLiteralSymbol] = pointer;
    this[destructorGuardSymbol] =
      uniffiTypeEnhancerObjectFactory.bless(pointer);
  } // Methods:

  /**
   * Process an interleaved, 10ms frame.
   */ process(frame: NativeAudioBufferMut): void {
    /* Regular function call: */
    uniffiCaller.rustCallWithError(
      /*liftError:*/ (buffer) => [
        "EnhancerError",
        FfiConverterTypeEnhancerError.lift(buffer),
      ],
      /*caller:*/ (callStatus) => {
        let frameArg = UniffiRustBufferValue.allocateWithBytes(
          FfiConverterTypeNativeAudioBufferMut.lower(frame),
        ).toStruct();

        const returnValue =
          FFI_DYNAMIC_LIB.uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_process(
            [
              uniffiTypeEnhancerObjectFactory.clonePointer(this),
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
        "EnhancerError",
        FfiConverterTypeEnhancerError.lift(buffer),
      ],
      /*caller:*/ (callStatus) => {
        let channelsArg = UniffiRustBufferValue.allocateWithBytes(
          new FfiConverterArray(FfiConverterTypeNativeAudioBufferMut).lower(
            channels,
          ),
        ).toStruct();

        const returnValue =
          FFI_DYNAMIC_LIB.uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_process_planar(
            [
              uniffiTypeEnhancerObjectFactory.clonePointer(this),
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
        "EnhancerError",
        FfiConverterTypeEnhancerError.lift(buffer),
      ],
      /*caller:*/ (callStatus) => {
        let frameArg = UniffiRustBufferValue.allocateWithBytes(
          FfiConverterTypeNativeAudioBufferMut.lower(frame),
        ).toStruct();

        const returnValue =
          FFI_DYNAMIC_LIB.uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_process_with_vad(
            [
              uniffiTypeEnhancerObjectFactory.clonePointer(this),
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

 */ updateCredentials(credentials: Credentials): void {
    /* Regular function call: */
    uniffiCaller.rustCallWithError(
      /*liftError:*/ (buffer) => [
        "EnhancerError",
        FfiConverterTypeEnhancerError.lift(buffer),
      ],
      /*caller:*/ (callStatus) => {
        let credentialsArg = UniffiRustBufferValue.allocateWithBytes(
          FfiConverterTypeCredentials.lower(credentials),
        ).toStruct();

        const returnValue =
          FFI_DYNAMIC_LIB.uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_update_credentials(
            [
              uniffiTypeEnhancerObjectFactory.clonePointer(this),
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
          FFI_DYNAMIC_LIB.uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_update_stream_info(
            [
              uniffiTypeEnhancerObjectFactory.clonePointer(this),
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
      const pointer = uniffiTypeEnhancerObjectFactory.pointer(this);
      uniffiTypeEnhancerObjectFactory.freePointer(pointer);
      uniffiTypeEnhancerObjectFactory.unbless(ptr);
      delete (this as any)[destructorGuardSymbol];
    }
  }
  [Symbol.dispose] = this.uniffiDestroy;

  static instanceOf(obj: any): obj is Enhancer {
    return uniffiTypeEnhancerObjectFactory.isConcreteType(obj);
  }

  // FIXME: maybe add `.equal(a, b)` static method like many protobuf libraries have?
  // FIXME: maybe add `.clone()` method?
}

const uniffiTypeEnhancerObjectFactory: UniffiObjectFactory<Enhancer> = (() => {
  /// <reference lib="es2021" />
  const registry =
    typeof (globalThis as any).FinalizationRegistry !== "undefined"
      ? new (globalThis as any).FinalizationRegistry(
          (heldValue: UnsafeMutableRawPointer) => {
            uniffiTypeEnhancerObjectFactory.freePointer(heldValue);
          },
        )
      : null;

  return {
    create(pointer: UnsafeMutableRawPointer): Enhancer {
      const instance = Object.create(Enhancer.prototype);
      instance[pointerLiteralSymbol] = pointer;
      instance[destructorGuardSymbol] = this.bless(pointer);
      instance[uniffiTypeNameSymbol] = "Enhancer";
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

    pointer(obj: Enhancer): UnsafeMutableRawPointer {
      if (typeof (obj as any)[destructorGuardSymbol] === "undefined") {
        throw new UniffiInternalError.UnexpectedNullPointer();
      }
      return (obj as any)[pointerLiteralSymbol];
    },

    clonePointer(obj: Enhancer): UnsafeMutableRawPointer {
      const handleArg = this.pointer(obj);
      return uniffiCaller.rustCall(
        /*caller:*/ (callStatus) => {
          return FFI_DYNAMIC_LIB.uniffi_plugins_ai_coustics_uniffi_fn_clone_enhancer(
            [handleArg, callStatus],
          );
        },
        /*liftString:*/ FfiConverterString.lift,
      );
    },

    freePointer(handleArg: UnsafeMutableRawPointer): void {
      uniffiCaller.rustCall(
        /*caller:*/ (callStatus) => {
          return FFI_DYNAMIC_LIB.uniffi_plugins_ai_coustics_uniffi_fn_free_enhancer(
            [handleArg, callStatus],
          );
        },
        /*liftString:*/ FfiConverterString.lift,
      );
    },

    isConcreteType(obj: any): obj is Enhancer {
      return (
        obj[destructorGuardSymbol] && obj[uniffiTypeNameSymbol] === "Enhancer"
      );
    },
  };
})();

// FfiConverter for TodoListInterface
const FfiConverterTypeEnhancer = new FfiConverterObject(
  uniffiTypeEnhancerObjectFactory,
);

// ==========
// Function definitions:
// ==========
