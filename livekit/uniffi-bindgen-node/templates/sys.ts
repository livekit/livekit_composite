import { join, dirname } from "path";
{% if out_dirname_api == DirnameApi::ImportMetaUrl %}
import { fileURLToPath } from 'url';
{% endif %}
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
} from 'ffi-rs';
import {
  type UniffiByteArray,
  UniffiInternalError,
  uniffiCreateFfiConverterString,
  UniffiError,
} from 'uniffi-bindgen-react-native';

const CALL_SUCCESS = 0, CALL_ERROR = 1, CALL_UNEXPECTED_ERROR = 2, CALL_CANCELLED = 3;


let libraryLoaded = false;
/**
 * Loads the dynamic library from disk into memory.
 * {% if out_disable_auto_loading_lib -%}NOTE: this must be called before any other functions in this module are called.{%- endif %}
 */
function _uniffiLoad() {
  const library = "lib{{ ci.crate_name() }}";
  const { platform } = process;
  let ext = { darwin: "dylib", win32: "dll", linux: "so" }[platform as string];
  if (!ext) {
    console.warn("Unsupported platform:", platform);
    ext = "so";
  }
  {% match out_dirname_api %}
  {% when DirnameApi::Dirname %}
  const libraryDirectory = __dirname;
  {% when DirnameApi::ImportMetaUrl %}
  const libraryDirectory = dirname(fileURLToPath(import.meta.url));
  {% endmatch %}
  const libraryPath = join(libraryDirectory, `${library}.${ext}`);
  open({ library, path: libraryPath });
  libraryLoaded = true;
}

/**
 * Unloads the dynamic library from disk from memory. This can be used to clean up the library early
 * before program execution completes.
 */
function _uniffiUnload() {
  close('lib{{ ci.crate_name() }}');
  libraryLoaded = false;
}

function _checkUniffiLoaded() {
  if (!libraryLoaded) {
    throw new Error('Uniffi function call was issued, but the native dependency was not loaded. Ensure you are calling uniffiLoad() before interacting with any uniffi backed functionality.');
  }
}

{% if out_disable_auto_loading_lib %}
export { _uniffiLoad as uniffiLoad, _uniffiUnload as uniffiUnload };
{% else %}
_uniffiLoad();
{% endif %}

// Release library memory before process terminates
// TODO: is this even really required?
process.on('beforeExit', () => {
  if (libraryLoaded) {
    _uniffiUnload();
  }
});


const [nullPointer] = unwrapPointer(createPointer({
  paramsType: [DataType.Void],
  paramsValue: [undefined]
}));

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
      paramsValue: [{
        code: CALL_SUCCESS,
        error_buf: { capacity: 0, len: 0, data: nullPointer },
      }],
    });

    return $callStatus as [JsExternal];
  }

  createErrorStatus(_code: number, _errorBuf: UniffiByteArray): JsExternal {
    // FIXME: what is this supposed to do and how does it not allocate `errorBuf` when making the
    // call status struct?
    throw new Error('UniffiRustCaller.createErrorStatus is unimplemented.');

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
  liftError?: (buffer: UniffiByteArray) => [string, string],
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
export const FfiConverterString = uniffiCreateFfiConverterString(stringConverter);

// Struct + Callback type definitions
export type UniffiRustBufferStruct = { capacity: bigint, len: bigint, data: JsExternal };
const DataType_UniffiRustBufferStruct = {
  capacity: DataType.U64,
  len: DataType.U64,
  data: DataType.External,

  ffiTypeTag: DataType.StackStruct,
};

export type UniffiForeignBytes = { len: number, data: JsExternal };
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
    const [ dataPointer ] = createPointer({
      paramsType: [arrayConstructor({ type: DataType.U8Array, length: bytes.length })],
      paramsValue: [bytes],
    });

    const rustBuffer = uniffiCaller.rustCall(
      (callStatus) => {
        return FFI_DYNAMIC_LIB.{{ci.ffi_rustbuffer_from_bytes().name()}}([
          // TODO: figure out why this is necessary.
          { data: unwrapPointer([dataPointer])[0], len: bytes.byteLength },
          callStatus,
        ]);
      },
      /*liftString:*/ {{ &Type::String | typescript_ffi_converter_name }}.lift,
    );

    freePointer({
      paramsType: [arrayConstructor({ type: DataType.U8Array, length: bytes.byteLength })],
      paramsValue: [dataPointer],
      pointerType: PointerType.RsPointer
    });

    return new UniffiRustBufferValue(rustBuffer);
  }

  static allocateEmpty() {
    return UniffiRustBufferValue.allocateWithBytes(new Uint8Array());
  }

  toStruct() {
    if (!this.struct) {
      throw new Error('Error getting struct data for UniffiRustBufferValue - struct.data has been freed! This is not allowed.');
    }
    return this.struct;
  }

  toUint8Array() {
    if (!this.struct) {
      throw new Error('Error converting rust buffer to uint8array - struct.data has been freed! This is not allowed.');
    }
    if (this.struct.len > Number.MAX_VALUE) {
      throw new Error(`Error converting rust buffer to uint8array - rust buffer length is ${this.struct.len}, which cannot be represented as a Number safely.`)
    }

    const [contents] = restorePointer({
      retType: [arrayConstructor({ type: DataType.U8Array, length: Number(this.struct.len) })],
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
    console.log('Rust buffer destroy called', this.struct)
    if (!this.struct) {
      throw new Error('Error destroying UniffiRustBufferValue - already previously destroyed! Double freeing is not allowed.');
    }

    uniffiCaller.rustCall(
      (callStatus) => {
        FFI_DYNAMIC_LIB.{{ci.ffi_rustbuffer_free().name()}}([this.struct!, callStatus]);
      },
      /*liftString:*/ {{ &Type::String | typescript_ffi_converter_name }}.lift,
    );
    // freePointer({
    //   paramsType: [arrayConstructor({ type: DataType.U8Array, length: this.struct.len })],
    //   paramsValue: wrapPointer([this.struct.data]),
    //   pointerType: PointerType.RsPointer,
    // });

    // console.log('DONE');
    this.struct = null;
  }
}

export type UniffiRustCallStatusStruct = { code: number, error_buf: UniffiRustBufferStruct };
const DataType_UniffiRustCallStatus = {
  code: DataType.U8,
  error_buf: DataType_UniffiRustBufferStruct,
};

{%- for definition in ci.ffi_definitions() -%}
  {%- match definition %}
    {%- when FfiDefinition::CallbackFunction(callback) %}
    export type {{ callback.name() | typescript_callback_name }} = (
      {%- for arg in callback.arguments() %}
        {{ arg.name() }}: {{ arg.type_().borrow() | typescript_ffi_type_name }}{% if !loop.last %}, {% endif %}
      {%- endfor %}
      {%-   if callback.has_rust_call_status_arg() -%}
      {%      if callback.arguments().len() > 0 %}, {% endif %}{{ &FfiType::RustCallStatus | typescript_ffi_type_name }}
      {%-   endif %}
    ) => {% match callback.return_type() %}
    {%-   when Some(return_type) -%}
      {{- return_type | typescript_ffi_type_name -}}
    {%-   when None -%}
      void
    {%- endmatch %};

    {%- when FfiDefinition::Struct(struct_data) -%}
    export type {{ struct_data.name() | typescript_ffi_struct_name }} = {
      {%- for field_def in struct_data.fields() -%}
          {{field_def.name() | typescript_var_name}}: {{field_def.type_().borrow() | typescript_ffi_type_name}};
      {%- endfor %}
    };

    const DataType_{{ struct_data.name() | typescript_ffi_struct_name }} = {
      {% for field_def in struct_data.fields() -%}
          {{field_def.name() | typescript_var_name}}: {{field_def.type_().borrow() | typescript_ffi_datatype_name}},
      {% endfor %}

      // Ensure that the struct is stack defined, without this ffi-rs isn't able to decode the
      // struct properly
      ffiTypeTag: DataType.StackStruct,
    };
    {%- else -%}
  {%- endmatch %}
{%- endfor %}


// Actual FFI functions from dynamic library
/** This direct / "extern C" type FFI interface is bound directly to the functions exposed by the
  * dynamic library. Using this manually from end-user javascript code is unsafe and this is not
  * recommended. */
const FFI_DYNAMIC_LIB = define({
  {%- for definition in ci.ffi_definitions() %}
    {%- match definition %}

    {%- when FfiDefinition::CallbackFunction(callback) %}
    {{ callback.name() }}: {
      library: "lib{{ ci.crate_name() }}",
      retType: {%- match callback.return_type() %}
      {%-   when Some(return_type) %}
        {{- return_type | typescript_ffi_datatype_name -}}
      {%-   when None %}
        DataType.Void
      {%- endmatch %},
      paramsType: [
        {%- for arg in callback.arguments() %}
          {{ arg.type_().borrow() | typescript_ffi_datatype_name }}{% if !loop.last %}, {% endif %}
        {%- endfor %}
        {%-   if callback.has_rust_call_status_arg() -%}
        {%      if callback.arguments().len() > 0 %}, {% endif %}{{ &FfiType::RustCallStatus | typescript_ffi_datatype_name }}
        {%-   endif %}
      ],
    },

    {%- when FfiDefinition::Function(func) %}
    {{ func.name() }}: {
      library: "lib{{ ci.crate_name() }}",
      retType: {%- match func.return_type() %}
      {%-   when Some(return_type) %}
        {{- return_type | typescript_ffi_datatype_name -}}
      {%-   when None %}
        DataType.Void
      {%- endmatch %},
      paramsType: [
        {%- for arg in func.arguments() %}
          {{ arg.type_().borrow() | typescript_ffi_datatype_name }}{% if !loop.last %}, {% endif %}
        {%- endfor %}
        {%-   if func.has_rust_call_status_arg() -%}
        {%      if func.arguments().len() > 0 %}, {% endif -%}
        {{ &FfiType::RustCallStatus | typescript_ffi_datatype_name }}
        {%-   endif %}
      ],
    },

    {%- else %}
    {%- endmatch %}

  {%- endfor %}
}) as unknown as {
  {%- for definition in ci.ffi_definitions() %}
    {%- match definition %}

    {%- when FfiDefinition::CallbackFunction(callback) %}
    {{ callback.name() }}: (args: [
      {%- for arg in callback.arguments() %}
        /* {{ arg.name() }} */ {{ arg.type_().borrow() | typescript_ffi_type_name }}{% if !loop.last %}, {% endif %}
      {%- endfor %}
      {%-   if callback.has_rust_call_status_arg() -%}
      {%      if callback.arguments().len() > 0 %}, {% endif %} RustCallStatus
      {%-   endif %}
    ]) => {%- match callback.return_type() %}
    {%-   when Some(return_type) %}
      {{- return_type | typescript_ffi_type_name -}}
    {%-   when None %}
      void
    {%- endmatch %},

    {%- when FfiDefinition::Function(func) %}
    {{ func.name() }}: (args: [
      {%- for arg in func.arguments() %}
        /* {{ arg.name() }} */ {{ arg.type_().borrow() | typescript_ffi_type_name }}{% if !loop.last %}, {% endif %}
      {%- endfor %}
      {%-   if func.has_rust_call_status_arg() -%}
      {%      if func.arguments().len() > 0 %}, {% endif %}{{ &FfiType::RustCallStatus | typescript_ffi_type_name }}
      {%-   endif %}
    ]) => {%- match func.return_type() %}
    {%-   when Some(return_type) %}
      {{- return_type | typescript_ffi_type_name -}}
    {%-   when None %}
      void
    {%- endmatch %},

    {%- else %}
    {%- endmatch %}

  {%- endfor %}
};

export default FFI_DYNAMIC_LIB;
