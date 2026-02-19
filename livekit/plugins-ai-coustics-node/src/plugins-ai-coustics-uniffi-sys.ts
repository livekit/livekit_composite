import { join, dirname } from "path";

import { fileURLToPath } from "url";

import {
  DataType,
  JsExternal,
  open,
  close,
  define,
  arrayConstructor,
  restorePointer,
  wrapPointer,
  unwrapPointer,
  createPointer,
  freePointer,
  isNullPointer,
  PointerType,
} from "ffi-rs";
import {
  type UniffiByteArray,
  UniffiInternalError,
  uniffiCreateFfiConverterString,
  UniffiError,
} from "uniffi-bindgen-react-native";

const CALL_SUCCESS = 0,
  CALL_ERROR = 1,
  CALL_UNEXPECTED_ERROR = 2,
  CALL_CANCELLED = 3;

let libraryLoaded = false;
/**
 * Loads the dynamic library from disk into memory.
 *
 */
function _uniffiLoad() {
  const library = "libplugins_ai_coustics_uniffi";
  const { platform } = process;
  let ext = { darwin: "dylib", win32: "dll", linux: "so" }[platform as string];
  if (!ext) {
    console.warn("Unsupported platform:", platform);
    ext = "so";
  }

  const filePath = fileURLToPath(import.meta.url);
  const libraryDirectory = dirname(filePath);

  // Get the path to the lib to load
  const libraryPath = join(libraryDirectory, `${library}.${ext}`);

  open({ library, path: libraryPath });
  libraryLoaded = true;
}

/**
 * Unloads the dynamic library from disk from memory. This can be used to clean up the library early
 * before program execution completes.
 */
function _uniffiUnload() {
  close("libplugins_ai_coustics_uniffi");
  libraryLoaded = false;
}

function _checkUniffiLoaded() {
  if (!libraryLoaded) {
    throw new Error(
      "Uniffi function call was issued, but the native dependency was not loaded. Ensure you are calling uniffiLoad() before interacting with any uniffi backed functionality.",
    );
  }
}

_uniffiLoad();

// Release library memory before process terminates
// TODO: is this even really required?
process.on("beforeExit", () => {
  if (libraryLoaded) {
    _uniffiUnload();
  }
});

const [nullPointer] = unwrapPointer(
  createPointer({
    paramsType: [DataType.Void],
    paramsValue: [undefined],
  }),
);

class UniffiFfiRsRustCaller {
  rustCall<T>(
    caller: (status: JsExternal) => T,
    liftString: (bytes: UniffiByteArray) => string,
  ): T {
    return this.makeRustCall(caller, liftString);
  }

  rustCallWithError<T, ErrorEnumAndVariant extends [string, string]>(
    liftError: (buffer: UniffiByteArray) => ErrorEnumAndVariant,
    caller: (status: JsExternal) => T,
    liftString: (bytes: UniffiByteArray) => string,
  ): T {
    return this.makeRustCall(caller, liftString, liftError);
  }

  createCallStatus(): [JsExternal] {
    const $callStatus = createPointer({
      paramsType: [DataType_UniffiRustCallStatus],
      paramsValue: [
        {
          code: CALL_SUCCESS,
          error_buf: { capacity: 0, len: 0, data: nullPointer },
        },
      ],
    });

    return $callStatus as [JsExternal];
  }

  createErrorStatus(_code: number, _errorBuf: UniffiByteArray): JsExternal {
    // FIXME: what is this supposed to do and how does it not allocate `errorBuf` when making the
    // call status struct?
    throw new Error("UniffiRustCaller.createErrorStatus is unimplemented.");

    // const status = this.statusConstructor();
    // status.code = code;
    // status.errorBuf = errorBuf;
    // return status;
  }

  makeRustCall<T, ErrorEnumAndVariant extends [string, string]>(
    caller: (status: JsExternal) => T,
    liftString: (bytes: UniffiByteArray) => string,
    liftError?: (buffer: UniffiByteArray) => ErrorEnumAndVariant,
  ): T {
    _checkUniffiLoaded();

    const $callStatus = this.createCallStatus();
    let returnedVal = caller(unwrapPointer($callStatus)[0]);

    const [callStatus] = restorePointer({
      retType: [DataType_UniffiRustCallStatus],
      paramsValue: $callStatus,
    });
    uniffiCheckCallStatus(callStatus, liftString, liftError);

    return returnedVal;
  }
}

function uniffiCheckCallStatus<ErrorEnumAndVariant extends [string, string]>(
  callStatus: UniffiRustCallStatusStruct,
  liftString: (bytes: UniffiByteArray) => string,
  liftError?: (buffer: UniffiByteArray) => ErrorEnumAndVariant,
) {
  switch (callStatus.code) {
    case CALL_SUCCESS:
      return;

    case CALL_ERROR: {
      // - Rust will not set the data pointer for a sucessful return.
      // - If unsuccesful, lift the error from the RustBuf and free.
      if (!isNullPointer(callStatus.error_buf.data)) {
        const struct = new UniffiRustBufferValue(callStatus.error_buf);
        const errorBufBytes = struct.consumeIntoUint8Array();

        if (liftError) {
          const [enumName, errorVariant] = liftError(errorBufBytes);
          throw new UniffiError(enumName, errorVariant);
        }
      }
      throw new UniffiInternalError.UnexpectedRustCallError();
    }

    case CALL_UNEXPECTED_ERROR: {
      // When the rust code sees a panic, it tries to construct a RustBuffer
      // with the message.  But if that code panics, then it just sends back
      // an empty buffer.

      if (!isNullPointer(callStatus.error_buf.data)) {
        const struct = new UniffiRustBufferValue(callStatus.error_buf);
        const errorBufBytes = struct.consumeIntoUint8Array();

        if (errorBufBytes.byteLength > 0) {
          const liftedErrorBuf = liftString(errorBufBytes);
          throw new UniffiInternalError.RustPanic(liftedErrorBuf);
        }
      }

      throw new UniffiInternalError.RustPanic("Rust panic");
    }

    case CALL_CANCELLED:
      // #RUST_TASK_CANCELLATION:
      //
      // This error code is expected when a Rust Future is cancelled or aborted, either
      // from the foreign side, or from within Rust itself.
      //
      // As of uniffi-rs v0.28.0, call cancellation is only checked for in the Swift bindings,
      // and uses an Unimplemeneted error.
      throw new UniffiInternalError.AbortError();

    default:
      throw new UniffiInternalError.UnexpectedRustCallStatusCode();
  }
}

export const uniffiCaller = new UniffiFfiRsRustCaller();

export const stringConverter = (() => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return {
    stringToBytes: (s: string) => encoder.encode(s),
    bytesToString: (ab: UniffiByteArray) => decoder.decode(ab),
    stringByteLength: (s: string) => encoder.encode(s).byteLength,
  };
})();
export const FfiConverterString =
  uniffiCreateFfiConverterString(stringConverter);

// Struct + Callback type definitions
export type UniffiRustBufferStruct = {
  capacity: bigint;
  len: bigint;
  data: JsExternal;
};
const DataType_UniffiRustBufferStruct = {
  capacity: DataType.U64,
  len: DataType.U64,
  data: DataType.External,

  ffiTypeTag: DataType.StackStruct,
};

export type UniffiForeignBytes = { len: number; data: JsExternal };
const DataType_UniffiForeignBytes = {
  len: DataType.I32,
  data: DataType.External,

  ffiTypeTag: DataType.StackStruct,
};

/** A UniffiRustBufferValue represents stack allocated structure containing pointer to series of
 * bytes most likely on the heap, along with the size of that data in bytes.
 *
 * It is often used to encode more complex function parameters / return values like structs,
 * optionals, etc.
 *
 * `RustBufferValue`s are behind the scenes backed by manually managed memory on the rust end, and
 * must be explictly destroyed when no longer used to ensure no memory is leaked.
 * */
export class UniffiRustBufferValue {
  private struct: UniffiRustBufferStruct | null;

  constructor(struct: UniffiRustBufferStruct) {
    this.struct = struct;
  }

  static allocateWithBytes(bytes: Uint8Array) {
    const [dataPointer] = createPointer({
      paramsType: [
        arrayConstructor({ type: DataType.U8Array, length: bytes.length }),
      ],
      paramsValue: [bytes],
    });

    const rustBuffer = uniffiCaller.rustCall((callStatus) => {
      return FFI_DYNAMIC_LIB.ffi_plugins_ai_coustics_uniffi_rustbuffer_from_bytes(
        [
          // TODO: figure out why this is necessary.
          { data: unwrapPointer([dataPointer])[0], len: bytes.byteLength },
          callStatus,
        ],
      );
    }, /*liftString:*/ FfiConverterString.lift);

    freePointer({
      paramsType: [
        arrayConstructor({ type: DataType.U8Array, length: bytes.byteLength }),
      ],
      paramsValue: [dataPointer],
      pointerType: PointerType.RsPointer,
    });

    return new UniffiRustBufferValue(rustBuffer);
  }

  static allocateEmpty() {
    return UniffiRustBufferValue.allocateWithBytes(new Uint8Array());
  }

  toStruct() {
    if (!this.struct) {
      throw new Error(
        "Error getting struct data for UniffiRustBufferValue - struct.data has been freed! This is not allowed.",
      );
    }
    return this.struct;
  }

  toUint8Array() {
    if (!this.struct) {
      throw new Error(
        "Error converting rust buffer to uint8array - struct.data has been freed! This is not allowed.",
      );
    }
    if (this.struct.len > Number.MAX_VALUE) {
      throw new Error(
        `Error converting rust buffer to uint8array - rust buffer length is ${this.struct.len}, which cannot be represented as a Number safely.`,
      );
    }

    const [contents] = restorePointer({
      retType: [
        arrayConstructor({
          type: DataType.U8Array,
          length: Number(this.struct.len),
        }),
      ],
      paramsValue: wrapPointer([this.struct.data]),
    });

    return new Uint8Array(contents);
  }

  consumeIntoUint8Array() {
    const result = this.toUint8Array();
    this.destroy();
    return result;
  }

  destroy() {
    if (!this.struct) {
      throw new Error(
        "Error destroying UniffiRustBufferValue - already previously destroyed! Double freeing is not allowed.",
      );
    }

    uniffiCaller.rustCall((callStatus) => {
      FFI_DYNAMIC_LIB.ffi_plugins_ai_coustics_uniffi_rustbuffer_free([
        this.struct!,
        callStatus,
      ]);
    }, /*liftString:*/ FfiConverterString.lift);
    // freePointer({
    //   paramsType: [arrayConstructor({ type: DataType.U8Array, length: this.struct.len })],
    //   paramsValue: wrapPointer([this.struct.data]),
    //   pointerType: PointerType.RsPointer,
    // });

    // console.log('DONE');
    this.struct = null;
  }
}

export type UniffiRustCallStatusStruct = {
  code: number;
  error_buf: UniffiRustBufferStruct;
};
const DataType_UniffiRustCallStatus = {
  code: DataType.U8,
  error_buf: DataType_UniffiRustBufferStruct,
};
export type UniffiCallbackRustFutureContinuationCallback = (
  data: bigint,
  poll_result: number,
) => void;
export type UniffiCallbackForeignFutureDroppedCallback = (
  handle: bigint,
) => void;
export type UniffiCallbackCallbackInterfaceFree = (handle: bigint) => void;
export type UniffiCallbackCallbackInterfaceClone = (handle: bigint) => bigint;
export type UniffiForeignFutureDroppedCallbackStruct = {
  handle: bigint;
  free: /* callback UniffiCallbackForeignFutureDroppedCallback */ JsExternal;
};

const DataType_UniffiForeignFutureDroppedCallbackStruct = {
  handle: DataType.U64,
  free: /* callback */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiForeignFutureResultU8 = {
  returnValue: number;
  callStatus: /* RustCallStatus */ JsExternal;
};

const DataType_UniffiForeignFutureResultU8 = {
  returnValue: DataType.U8,
  callStatus: /* RustCallStatus */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiCallbackForeignFutureCompleteU8 = (
  callback_data: bigint,
  result: UniffiForeignFutureResultU8,
) => void;
export type UniffiForeignFutureResultI8 = {
  returnValue: number;
  callStatus: /* RustCallStatus */ JsExternal;
};

const DataType_UniffiForeignFutureResultI8 = {
  returnValue: /* i8 */ DataType.U8,
  callStatus: /* RustCallStatus */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiCallbackForeignFutureCompleteI8 = (
  callback_data: bigint,
  result: UniffiForeignFutureResultI8,
) => void;
export type UniffiForeignFutureResultU16 = {
  returnValue: number;
  callStatus: /* RustCallStatus */ JsExternal;
};

const DataType_UniffiForeignFutureResultU16 = {
  returnValue: /* u16 */ DataType.U64,
  callStatus: /* RustCallStatus */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiCallbackForeignFutureCompleteU16 = (
  callback_data: bigint,
  result: UniffiForeignFutureResultU16,
) => void;
export type UniffiForeignFutureResultI16 = {
  returnValue: number;
  callStatus: /* RustCallStatus */ JsExternal;
};

const DataType_UniffiForeignFutureResultI16 = {
  returnValue: DataType.I16,
  callStatus: /* RustCallStatus */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiCallbackForeignFutureCompleteI16 = (
  callback_data: bigint,
  result: UniffiForeignFutureResultI16,
) => void;
export type UniffiForeignFutureResultU32 = {
  returnValue: number;
  callStatus: /* RustCallStatus */ JsExternal;
};

const DataType_UniffiForeignFutureResultU32 = {
  returnValue: /* u32 */ DataType.U64,
  callStatus: /* RustCallStatus */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiCallbackForeignFutureCompleteU32 = (
  callback_data: bigint,
  result: UniffiForeignFutureResultU32,
) => void;
export type UniffiForeignFutureResultI32 = {
  returnValue: number;
  callStatus: /* RustCallStatus */ JsExternal;
};

const DataType_UniffiForeignFutureResultI32 = {
  returnValue: DataType.I32,
  callStatus: /* RustCallStatus */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiCallbackForeignFutureCompleteI32 = (
  callback_data: bigint,
  result: UniffiForeignFutureResultI32,
) => void;
export type UniffiForeignFutureResultU64 = {
  returnValue: bigint;
  callStatus: /* RustCallStatus */ JsExternal;
};

const DataType_UniffiForeignFutureResultU64 = {
  returnValue: DataType.U64,
  callStatus: /* RustCallStatus */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiCallbackForeignFutureCompleteU64 = (
  callback_data: bigint,
  result: UniffiForeignFutureResultU64,
) => void;
export type UniffiForeignFutureResultI64 = {
  returnValue: bigint;
  callStatus: /* RustCallStatus */ JsExternal;
};

const DataType_UniffiForeignFutureResultI64 = {
  returnValue: DataType.I64,
  callStatus: /* RustCallStatus */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiCallbackForeignFutureCompleteI64 = (
  callback_data: bigint,
  result: UniffiForeignFutureResultI64,
) => void;
export type UniffiForeignFutureResultF32 = {
  returnValue: number;
  callStatus: /* RustCallStatus */ JsExternal;
};

const DataType_UniffiForeignFutureResultF32 = {
  returnValue: /* f32 */ DataType.Float,
  callStatus: /* RustCallStatus */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiCallbackForeignFutureCompleteF32 = (
  callback_data: bigint,
  result: UniffiForeignFutureResultF32,
) => void;
export type UniffiForeignFutureResultF64 = {
  returnValue: number;
  callStatus: /* RustCallStatus */ JsExternal;
};

const DataType_UniffiForeignFutureResultF64 = {
  returnValue: /* f64 */ DataType.Double,
  callStatus: /* RustCallStatus */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiCallbackForeignFutureCompleteF64 = (
  callback_data: bigint,
  result: UniffiForeignFutureResultF64,
) => void;
export type UniffiForeignFutureResultRustBuffer = {
  returnValue: /* RustBuffer */ UniffiRustBufferStruct;
  callStatus: /* RustCallStatus */ JsExternal;
};

const DataType_UniffiForeignFutureResultRustBuffer = {
  returnValue: DataType_UniffiRustBufferStruct,
  callStatus: /* RustCallStatus */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiCallbackForeignFutureCompleteRustBuffer = (
  callback_data: bigint,
  result: UniffiForeignFutureResultRustBuffer,
) => void;
export type UniffiForeignFutureResultVoid = {
  callStatus: /* RustCallStatus */ JsExternal;
};

const DataType_UniffiForeignFutureResultVoid = {
  callStatus: /* RustCallStatus */ DataType.External,

  // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
  // struct properly
  ffiTypeTag: DataType.StackStruct,
};
export type UniffiCallbackForeignFutureCompleteVoid = (
  callback_data: bigint,
  result: UniffiForeignFutureResultVoid,
) => void;

// Actual FFI functions from dynamic library
/** This direct / "extern C" type FFI interface is bound directly to the functions exposed by the
 * dynamic library. Using this manually from end-user javascript code is unsafe and this is not
 * recommended. */
const FFI_DYNAMIC_LIB = define({
  RustFutureContinuationCallback: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [DataType.U64, /* i8 */ DataType.U8],
  },
  ForeignFutureDroppedCallback: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [DataType.U64],
  },
  CallbackInterfaceFree: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [DataType.U64],
  },
  CallbackInterfaceClone: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.U64,
    paramsType: [DataType.U64],
  },
  ForeignFutureCompleteU8: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType.U64,
      /* UniffiForeignFutureResultU8 */ DataType.U8Array,
    ],
  },
  ForeignFutureCompleteI8: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType.U64,
      /* UniffiForeignFutureResultI8 */ DataType.U8Array,
    ],
  },
  ForeignFutureCompleteU16: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType.U64,
      /* UniffiForeignFutureResultU16 */ DataType.U8Array,
    ],
  },
  ForeignFutureCompleteI16: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType.U64,
      /* UniffiForeignFutureResultI16 */ DataType.U8Array,
    ],
  },
  ForeignFutureCompleteU32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType.U64,
      /* UniffiForeignFutureResultU32 */ DataType.U8Array,
    ],
  },
  ForeignFutureCompleteI32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType.U64,
      /* UniffiForeignFutureResultI32 */ DataType.U8Array,
    ],
  },
  ForeignFutureCompleteU64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType.U64,
      /* UniffiForeignFutureResultU64 */ DataType.U8Array,
    ],
  },
  ForeignFutureCompleteI64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType.U64,
      /* UniffiForeignFutureResultI64 */ DataType.U8Array,
    ],
  },
  ForeignFutureCompleteF32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType.U64,
      /* UniffiForeignFutureResultF32 */ DataType.U8Array,
    ],
  },
  ForeignFutureCompleteF64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType.U64,
      /* UniffiForeignFutureResultF64 */ DataType.U8Array,
    ],
  },
  ForeignFutureCompleteRustBuffer: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType.U64,
      /* UniffiForeignFutureResultRustBuffer */ DataType.U8Array,
    ],
  },
  ForeignFutureCompleteVoid: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType.U64,
      /* UniffiForeignFutureResultVoid */ DataType.U8Array,
    ],
  },
  uniffi_plugins_ai_coustics_uniffi_fn_clone_enhancer: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* handle */ DataType.U64,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  uniffi_plugins_ai_coustics_uniffi_fn_free_enhancer: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  uniffi_plugins_ai_coustics_uniffi_fn_constructor_enhancer_new: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* handle */ DataType.U64,
    paramsType: [
      DataType_UniffiRustBufferStruct,
      /* RustCallStatus */ DataType.External,
    ],
  },
  uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_process: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      DataType_UniffiRustBufferStruct,
      /* RustCallStatus */ DataType.External,
    ],
  },
  uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_process_planar: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      DataType_UniffiRustBufferStruct,
      /* RustCallStatus */ DataType.External,
    ],
  },
  uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_process_with_vad: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* i8 */ DataType.U8,
    paramsType: [
      /* handle */ DataType.U64,
      DataType_UniffiRustBufferStruct,
      /* RustCallStatus */ DataType.External,
    ],
  },
  uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_update_credentials: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      DataType_UniffiRustBufferStruct,
      /* RustCallStatus */ DataType.External,
    ],
  },
  uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_update_stream_info: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      DataType_UniffiRustBufferStruct,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rustbuffer_alloc: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType_UniffiRustBufferStruct,
    paramsType: [DataType.U64, /* RustCallStatus */ DataType.External],
  },
  ffi_plugins_ai_coustics_uniffi_rustbuffer_from_bytes: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType_UniffiRustBufferStruct,
    paramsType: [
      DataType_UniffiForeignBytes,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rustbuffer_free: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      DataType_UniffiRustBufferStruct,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rustbuffer_reserve: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType_UniffiRustBufferStruct,
    paramsType: [
      DataType_UniffiRustBufferStruct,
      DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_u8: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* callback */ DataType.External,
      /* handle */ DataType.U64,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_u8: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_free_u8: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_u8: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.U8,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_i8: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* callback */ DataType.External,
      /* handle */ DataType.U64,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_i8: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_free_i8: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_i8: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* i8 */ DataType.U8,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_u16: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* callback */ DataType.External,
      /* handle */ DataType.U64,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_u16: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_free_u16: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_u16: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* u16 */ DataType.U64,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_i16: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* callback */ DataType.External,
      /* handle */ DataType.U64,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_i16: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_free_i16: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_i16: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.I16,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_u32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* callback */ DataType.External,
      /* handle */ DataType.U64,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_u32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_free_u32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_u32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* u32 */ DataType.U64,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_i32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* callback */ DataType.External,
      /* handle */ DataType.U64,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_i32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_free_i32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_i32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.I32,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_u64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* callback */ DataType.External,
      /* handle */ DataType.U64,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_u64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_free_u64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_u64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.U64,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_i64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* callback */ DataType.External,
      /* handle */ DataType.U64,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_i64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_free_i64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_i64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.I64,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_f32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* callback */ DataType.External,
      /* handle */ DataType.U64,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_f32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_free_f32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_f32: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* f32 */ DataType.Float,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_f64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* callback */ DataType.External,
      /* handle */ DataType.U64,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_f64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_free_f64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_f64: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* f64 */ DataType.Double,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_rust_buffer: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* callback */ DataType.External,
      /* handle */ DataType.U64,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_rust_buffer: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_free_rust_buffer: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_rust_buffer: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType_UniffiRustBufferStruct,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_void: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* callback */ DataType.External,
      /* handle */ DataType.U64,
    ],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_void: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_free_void: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [/* handle */ DataType.U64],
  },
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_void: {
    library: "libplugins_ai_coustics_uniffi",
    retType: DataType.Void,
    paramsType: [
      /* handle */ DataType.U64,
      /* RustCallStatus */ DataType.External,
    ],
  },
  uniffi_plugins_ai_coustics_uniffi_checksum_method_enhancer_process: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* u16 */ DataType.U64,
    paramsType: [],
  },
  uniffi_plugins_ai_coustics_uniffi_checksum_method_enhancer_process_planar: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* u16 */ DataType.U64,
    paramsType: [],
  },
  uniffi_plugins_ai_coustics_uniffi_checksum_method_enhancer_process_with_vad: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* u16 */ DataType.U64,
    paramsType: [],
  },
  uniffi_plugins_ai_coustics_uniffi_checksum_method_enhancer_update_credentials:
    {
      library: "libplugins_ai_coustics_uniffi",
      retType: /* u16 */ DataType.U64,
      paramsType: [],
    },
  uniffi_plugins_ai_coustics_uniffi_checksum_method_enhancer_update_stream_info:
    {
      library: "libplugins_ai_coustics_uniffi",
      retType: /* u16 */ DataType.U64,
      paramsType: [],
    },
  uniffi_plugins_ai_coustics_uniffi_checksum_constructor_enhancer_new: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* u16 */ DataType.U64,
    paramsType: [],
  },
  ffi_plugins_ai_coustics_uniffi_uniffi_contract_version: {
    library: "libplugins_ai_coustics_uniffi",
    retType: /* u32 */ DataType.U64,
    paramsType: [],
  },
}) as unknown as {
  RustFutureContinuationCallback: (
    args: [/* data */ bigint, /* poll_result */ number],
  ) => void;
  ForeignFutureDroppedCallback: (args: [/* handle */ bigint]) => void;
  CallbackInterfaceFree: (args: [/* handle */ bigint]) => void;
  CallbackInterfaceClone: (args: [/* handle */ bigint]) => bigint;
  ForeignFutureCompleteU8: (
    args: [
      /* callback_data */ bigint,
      /* result */ UniffiForeignFutureResultU8,
    ],
  ) => void;
  ForeignFutureCompleteI8: (
    args: [
      /* callback_data */ bigint,
      /* result */ UniffiForeignFutureResultI8,
    ],
  ) => void;
  ForeignFutureCompleteU16: (
    args: [
      /* callback_data */ bigint,
      /* result */ UniffiForeignFutureResultU16,
    ],
  ) => void;
  ForeignFutureCompleteI16: (
    args: [
      /* callback_data */ bigint,
      /* result */ UniffiForeignFutureResultI16,
    ],
  ) => void;
  ForeignFutureCompleteU32: (
    args: [
      /* callback_data */ bigint,
      /* result */ UniffiForeignFutureResultU32,
    ],
  ) => void;
  ForeignFutureCompleteI32: (
    args: [
      /* callback_data */ bigint,
      /* result */ UniffiForeignFutureResultI32,
    ],
  ) => void;
  ForeignFutureCompleteU64: (
    args: [
      /* callback_data */ bigint,
      /* result */ UniffiForeignFutureResultU64,
    ],
  ) => void;
  ForeignFutureCompleteI64: (
    args: [
      /* callback_data */ bigint,
      /* result */ UniffiForeignFutureResultI64,
    ],
  ) => void;
  ForeignFutureCompleteF32: (
    args: [
      /* callback_data */ bigint,
      /* result */ UniffiForeignFutureResultF32,
    ],
  ) => void;
  ForeignFutureCompleteF64: (
    args: [
      /* callback_data */ bigint,
      /* result */ UniffiForeignFutureResultF64,
    ],
  ) => void;
  ForeignFutureCompleteRustBuffer: (
    args: [
      /* callback_data */ bigint,
      /* result */ UniffiForeignFutureResultRustBuffer,
    ],
  ) => void;
  ForeignFutureCompleteVoid: (
    args: [
      /* callback_data */ bigint,
      /* result */ UniffiForeignFutureResultVoid,
    ],
  ) => void;
  uniffi_plugins_ai_coustics_uniffi_fn_clone_enhancer: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => /* handle */ bigint;
  uniffi_plugins_ai_coustics_uniffi_fn_free_enhancer: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => void;
  uniffi_plugins_ai_coustics_uniffi_fn_constructor_enhancer_new: (
    args: [
      /* settings */ /* RustBuffer */ UniffiRustBufferStruct,
      /* RustCallStatus */ JsExternal,
    ],
  ) => /* handle */ bigint;
  uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_process: (
    args: [
      /* ptr */ /* handle */ bigint,
      /* frame */ /* RustBuffer */ UniffiRustBufferStruct,
      /* RustCallStatus */ JsExternal,
    ],
  ) => void;
  uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_process_planar: (
    args: [
      /* ptr */ /* handle */ bigint,
      /* channels */ /* RustBuffer */ UniffiRustBufferStruct,
      /* RustCallStatus */ JsExternal,
    ],
  ) => void;
  uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_process_with_vad: (
    args: [
      /* ptr */ /* handle */ bigint,
      /* frame */ /* RustBuffer */ UniffiRustBufferStruct,
      /* RustCallStatus */ JsExternal,
    ],
  ) => number;
  uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_update_credentials: (
    args: [
      /* ptr */ /* handle */ bigint,
      /* credentials */ /* RustBuffer */ UniffiRustBufferStruct,
      /* RustCallStatus */ JsExternal,
    ],
  ) => void;
  uniffi_plugins_ai_coustics_uniffi_fn_method_enhancer_update_stream_info: (
    args: [
      /* ptr */ /* handle */ bigint,
      /* info */ /* RustBuffer */ UniffiRustBufferStruct,
      /* RustCallStatus */ JsExternal,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rustbuffer_alloc: (
    args: [/* size */ bigint, /* RustCallStatus */ JsExternal],
  ) => /* RustBuffer */ UniffiRustBufferStruct;
  ffi_plugins_ai_coustics_uniffi_rustbuffer_from_bytes: (
    args: [/* bytes */ UniffiForeignBytes, /* RustCallStatus */ JsExternal],
  ) => /* RustBuffer */ UniffiRustBufferStruct;
  ffi_plugins_ai_coustics_uniffi_rustbuffer_free: (
    args: [
      /* buf */ /* RustBuffer */ UniffiRustBufferStruct,
      /* RustCallStatus */ JsExternal,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rustbuffer_reserve: (
    args: [
      /* buf */ /* RustBuffer */ UniffiRustBufferStruct,
      /* additional */ bigint,
      /* RustCallStatus */ JsExternal,
    ],
  ) => /* RustBuffer */ UniffiRustBufferStruct;
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_u8: (
    args: [
      /* handle */ /* handle */ bigint,
      /* callback */ /* callback UniffiCallbackRustFutureContinuationCallback */ JsExternal,
      /* callback_data */ /* handle */ bigint,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_u8: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_free_u8: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_u8: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => number;
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_i8: (
    args: [
      /* handle */ /* handle */ bigint,
      /* callback */ /* callback UniffiCallbackRustFutureContinuationCallback */ JsExternal,
      /* callback_data */ /* handle */ bigint,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_i8: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_free_i8: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_i8: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => number;
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_u16: (
    args: [
      /* handle */ /* handle */ bigint,
      /* callback */ /* callback UniffiCallbackRustFutureContinuationCallback */ JsExternal,
      /* callback_data */ /* handle */ bigint,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_u16: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_free_u16: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_u16: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => number;
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_i16: (
    args: [
      /* handle */ /* handle */ bigint,
      /* callback */ /* callback UniffiCallbackRustFutureContinuationCallback */ JsExternal,
      /* callback_data */ /* handle */ bigint,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_i16: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_free_i16: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_i16: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => number;
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_u32: (
    args: [
      /* handle */ /* handle */ bigint,
      /* callback */ /* callback UniffiCallbackRustFutureContinuationCallback */ JsExternal,
      /* callback_data */ /* handle */ bigint,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_u32: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_free_u32: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_u32: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => number;
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_i32: (
    args: [
      /* handle */ /* handle */ bigint,
      /* callback */ /* callback UniffiCallbackRustFutureContinuationCallback */ JsExternal,
      /* callback_data */ /* handle */ bigint,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_i32: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_free_i32: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_i32: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => number;
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_u64: (
    args: [
      /* handle */ /* handle */ bigint,
      /* callback */ /* callback UniffiCallbackRustFutureContinuationCallback */ JsExternal,
      /* callback_data */ /* handle */ bigint,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_u64: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_free_u64: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_u64: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => bigint;
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_i64: (
    args: [
      /* handle */ /* handle */ bigint,
      /* callback */ /* callback UniffiCallbackRustFutureContinuationCallback */ JsExternal,
      /* callback_data */ /* handle */ bigint,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_i64: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_free_i64: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_i64: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => bigint;
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_f32: (
    args: [
      /* handle */ /* handle */ bigint,
      /* callback */ /* callback UniffiCallbackRustFutureContinuationCallback */ JsExternal,
      /* callback_data */ /* handle */ bigint,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_f32: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_free_f32: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_f32: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => number;
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_f64: (
    args: [
      /* handle */ /* handle */ bigint,
      /* callback */ /* callback UniffiCallbackRustFutureContinuationCallback */ JsExternal,
      /* callback_data */ /* handle */ bigint,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_f64: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_free_f64: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_f64: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => number;
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_rust_buffer: (
    args: [
      /* handle */ /* handle */ bigint,
      /* callback */ /* callback UniffiCallbackRustFutureContinuationCallback */ JsExternal,
      /* callback_data */ /* handle */ bigint,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_rust_buffer: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_free_rust_buffer: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_rust_buffer: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => /* RustBuffer */ UniffiRustBufferStruct;
  ffi_plugins_ai_coustics_uniffi_rust_future_poll_void: (
    args: [
      /* handle */ /* handle */ bigint,
      /* callback */ /* callback UniffiCallbackRustFutureContinuationCallback */ JsExternal,
      /* callback_data */ /* handle */ bigint,
    ],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_cancel_void: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_free_void: (
    args: [/* handle */ /* handle */ bigint],
  ) => void;
  ffi_plugins_ai_coustics_uniffi_rust_future_complete_void: (
    args: [/* handle */ /* handle */ bigint, /* RustCallStatus */ JsExternal],
  ) => void;
  uniffi_plugins_ai_coustics_uniffi_checksum_method_enhancer_process: (
    args: [],
  ) => number;
  uniffi_plugins_ai_coustics_uniffi_checksum_method_enhancer_process_planar: (
    args: [],
  ) => number;
  uniffi_plugins_ai_coustics_uniffi_checksum_method_enhancer_process_with_vad: (
    args: [],
  ) => number;
  uniffi_plugins_ai_coustics_uniffi_checksum_method_enhancer_update_credentials: (
    args: [],
  ) => number;
  uniffi_plugins_ai_coustics_uniffi_checksum_method_enhancer_update_stream_info: (
    args: [],
  ) => number;
  uniffi_plugins_ai_coustics_uniffi_checksum_constructor_enhancer_new: (
    args: [],
  ) => number;
  ffi_plugins_ai_coustics_uniffi_uniffi_contract_version: (args: []) => number;
};

export default FFI_DYNAMIC_LIB;
