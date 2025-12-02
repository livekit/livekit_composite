{%- import "macros.ts" as ts %}

{%- macro function_return_type(func_def) -%}
  {%- if let Some(ret_type) = func_def.return_type() -%}: {# space #}
    {%- if func_def.is_async() -%}Promise<{%- endif -%}
    {{ ret_type | typescript_type_name }}
    {%- if func_def.is_async() -%}>{%- endif -%}
  {%- endif %}
{%- endmacro -%}

{%- macro function_return_type_or_void(func_def) -%}
  {%- call function_return_type(func_def) -%}
  {%- if func_def.return_type().is_none() -%}: void{%- endif %}
{%- endmacro -%}

{% macro function_call_body(func_def, associated_object_name = "") %}
  {%- if func_def.is_async() %}
    /* Async function call: */
    let lastPollCallbackPointer: Array<JsExternal> | null = null;
    const cleanupLastPollCallbackPointer = () => {
      if (!lastPollCallbackPointer) {
        return;
      }

      console.log("async cleanup last poll callback pointer");
      freePointer({
        paramsType: [funcConstructor({
            paramsType: [DataType.U64, /* i8 */ DataType.U8],
            retType: DataType.Void,
        })],
        paramsValue: lastPollCallbackPointer,
        pointerType: PointerType.RsPointer,
      });
    };

    {% for arg in func_def.arguments() -%}
      let {{ arg.name() | typescript_argument_var_name }} = {{ arg.name() | typescript_var_name | typescript_ffi_converter_lower_with(arg.as_type().borrow()) }};
    {% endfor -%}

    const returnValue = await uniffiRustCallAsync(
      // NOTE: this type assertion is being done to silence the fact that a completely custom (ie,
      // not just a superclass) `UniffiRustCaller` implementer is being used here, which is
      // required so that custom `free`ing logic can be run that the stock UniffiRustCaller
      // doesn't support.
      /*rustCaller:*/ uniffiCaller as unknown as UniffiRustCaller<UniffiRustCallStatus>,
      /*rustFutureFunc:*/ () => {
        console.log("{{ func_def.ffi_func().name() }} async call starting...");
        const returnedHandle = FFI_DYNAMIC_LIB.{{ func_def.ffi_func().name() }}([
          {% if let Some(self_type) = func_def.self_type() -%}
            {{ associated_object_name | typescript_ffi_object_factory_name }}.clonePointer(this)
            {%- if !func_def.arguments().is_empty() %}, {% endif -%}
          {% endif -%}

          {% for arg in func_def.arguments() -%}
            {{ arg.name() | typescript_argument_var_name }}
            {%- if !loop.last %}, {% endif %}
          {%- endfor -%}

          {%- if func_def.ffi_func().has_rust_call_status_arg() -%}
            {%- if !func_def.arguments().is_empty() || func_def.self_type().is_some() %}, {% endif -%}
            callStatus
          {%- endif %}
        ]);
        console.log("{{ func_def.ffi_func().name() }} returned handle:", returnedHandle);
        return returnedHandle;
      },
      /*pollFunc:*/ (handle, callback, callbackData) => {
        cleanupLastPollCallbackPointer();

        console.log("{{ func_def.ffi_func().name() }} async poll:", handle, callback, callbackData);
        const wrappedCallback = (callbackData: bigint, pollCodeRaw: number) => {
          // NOTE: ffi-rs doesn't support a DataType.I8 value under the hood, so instead `pollCode`
          // is being returned as a DataType.U8 as it is the same byte size. The below code
          // does the conversion from U8 -> I8.
          const pollCode = ((pollCodeRaw & 0b10000000) > 0 ? -1 : 1) * (pollCodeRaw & 0x01111111);

          console.log('{{ func_def.ffi_func().name() }} async poll callback fired with:', callbackData, pollCode);
          callback(
            BigInt(callbackData), /* FIXME: why must I convert callbackData from number -> bigint here? It looks like even though it is typed as DataType.U64 callbackData is passed as a number? */
            pollCode,
          );
        };
        const callbackExternal = createPointer({
          paramsType: [funcConstructor({
            paramsType: [DataType.U64, /* i8 */ DataType.U8],
            retType: DataType.Void,
          })],
          paramsValue: [wrappedCallback],
        });
        lastPollCallbackPointer = callbackExternal;
        const [ unwrapped ] = unwrapPointer(callbackExternal);

        FFI_DYNAMIC_LIB.{{ func_def.ffi_rust_future_poll(ci) }}([
          handle,
          unwrapped,
          Number(callbackData) /* FIXME: why must I convert callbackData from bigint -> number here for the ffi call to succeed? */
        ]);
        console.log('{{ func_def.ffi_func().name() }} async poll done');
        // setTimeout(() => { console.log('settimeout complete')}, 5000);
      },
      /*cancelFunc:*/ (handle) => {
        console.log('{{ func_def.ffi_func().name() }} async cancel:');
        return FFI_DYNAMIC_LIB.{{ func_def.ffi_rust_future_cancel(ci) }}([handle])
      },
      /*completeFunc:*/ (handle, callStatus) => {
        console.log('{{ func_def.ffi_func().name() }} async complete:');
        return FFI_DYNAMIC_LIB.{{ func_def.ffi_rust_future_complete(ci) }}([handle, callStatus])
      },
      /*freeFunc:*/ (handle) => {
        console.log('{{ func_def.ffi_func().name() }} async free:');
        cleanupLastPollCallbackPointer();
        return FFI_DYNAMIC_LIB.{{ func_def.ffi_rust_future_free(ci) }}([handle])
      },

      {% if let Some(ret_type) = func_def.return_type() -%}
        /*liftFunc:*/ (value) => {{ "value".into() | typescript_ffi_converter_lift_with(ret_type) }},
      {%- else -%}
        /*liftFunc:*/ (_v) => { /* void return value */ },
      {%- endif %}
      /*liftString:*/ FfiConverterString.lift,
      /*asyncOpts:*/ asyncOpts_
    );

    return returnValue;

  {% else %}
    /* Regular function call: */
    {% if func_def.return_type().is_some() %}const returnValue = {% endif -%}
    {%- match func_def.throws_type() -%}
      {%- when Some(err) -%}
        uniffiCaller.rustCallWithError(
          /*liftError:*/ (buffer) => ["{{err | typescript_type_name}}", {{err | typescript_ffi_converter_name}}.lift(buffer)],
          /*caller:*/ (callStatus) => {
      {%- else -%}
        uniffiCaller.rustCall(
          /*caller:*/ (callStatus) => {
    {%- endmatch %}
        {% for arg in func_def.arguments() -%}
          let {{ arg.name() | typescript_argument_var_name }} = {{ arg.name() | typescript_var_name | typescript_ffi_converter_lower_with(arg.as_type().borrow()) }};
        {% endfor -%}

        console.log("{{ func_def.ffi_func().name() }} call starting...");
        const returnValue = FFI_DYNAMIC_LIB.{{ func_def.ffi_func().name() }}([
          {% if let Some(self_type) = func_def.self_type() -%}
            {{ associated_object_name | typescript_ffi_object_factory_name }}.clonePointer(this)
            {%- if !func_def.arguments().is_empty() %}, {% endif -%}
          {% endif -%}

          {% for arg in func_def.arguments() -%}
            {{ arg.name() | typescript_argument_var_name }}
            {%- if !loop.last %}, {% endif %}
          {%- endfor -%}

          {%- if func_def.ffi_func().has_rust_call_status_arg() -%}
            {%- if !func_def.arguments().is_empty() || func_def.self_type().is_some() %}, {% endif -%}
            callStatus
          {%- endif %}
        ]);
        console.log("{{ func_def.ffi_func().name() }} return value:", returnValue{%- if func_def.ffi_func().has_rust_call_status_arg() -%}, 'Call status:', callStatus{%- endif -%});

        return returnValue;
      },
      /*liftString:*/ {{ &Type::String | typescript_ffi_converter_name }}.lift
    );

    {% if let Some(ret_type) = func_def.return_type() -%}
      return {{ "returnValue".into() | typescript_ffi_converter_lift_with(ret_type) }};
    {%- endif %}
  {% endif -%}
{%- endmacro %}





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
} from 'uniffi-bindgen-react-native';

import {
  DataType,
  type JsExternal,
  open, /* close, */
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
} from 'ffi-rs';


import FFI_DYNAMIC_LIB, {
  uniffiCaller,
  FfiConverterString,

  type UniffiRustBufferStruct,
  type UniffiForeignBytes,
  UniffiRustBufferValue,
  type UniffiRustCallStatusStruct,

  {%- for definition in ci.ffi_definitions() -%}
    {%- match definition %}
      {%- when FfiDefinition::CallbackFunction(callback) %}
      type {{ callback.name() | typescript_callback_name }}
      {%- if !loop.last %},{% endif %}

      {%- when FfiDefinition::Struct(struct_data) -%}
      type {{ struct_data.name() | typescript_ffi_struct_name }}
      {%- if !loop.last %},{% endif %}
      {%- else -%}
    {%- endmatch %}
  {%- endfor %}
} from './{%- call ts::import_file_path(sys_ts_main_file_name) -%}';


// ==========
// Record definitions:
// ==========

{% for record_def in ci.record_definitions() %}
{% call ts::docstring(record_def, 0) %}
export type {{ record_def.name() | typescript_class_name }} = {
  {%- for field_def in record_def.fields() -%}
    {% call ts::docstring(field_def, 0) %}
    {%- let type_ = field_def.as_type() %}
    {{field_def.name() | typescript_var_name}}: {{field_def | typescript_type_name}};
  {%- endfor %}
}

export const {{ record_def.name() | typescript_class_name }} = (() => {
  const defaults = () => ({}); // FIXME: add defaults here!
  const create = (() => {
    return uniffiCreateRecord<{{ record_def.name() | typescript_class_name }}, ReturnType<typeof defaults>>(
      defaults
    );
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link {{ record_def.name() | typescript_class_name }}}, with defaults specified
     * in Rust, in the {@link {{ci.crate_name()}}} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link {{ record_def.name() | typescript_class_name }}}, with defaults specified
     * in Rust, in the {@link {{ci.crate_name()}}} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link {{ci.crate_name()}}} crate.
     */
    defaults: () => Object.freeze(defaults()) as Partial<{{ record_def.name() | typescript_class_name }}>,
  });
})();

const {{ record_def.name() | typescript_ffi_converter_struct_enum_object_name }} = (() => {
  type TypeName = {{ record_def.name() | typescript_class_name }};
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        {% for field_def in record_def.fields() -%}
          {{ field_def.name() | typescript_var_name }}: {{ field_def.as_type().borrow() | typescript_ffi_converter_name }}.read(from),
        {% endfor %}
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      {% for field_def in record_def.fields() -%}
        {{ field_def.as_type().borrow() | typescript_ffi_converter_name }}.write(value.{{ field_def.name() | typescript_var_name }}, into);
      {% endfor %}
    }
    allocationSize(value: TypeName): number {
      return (
        {% for field_def in record_def.fields() -%}
          {{ field_def.as_type().borrow() | typescript_ffi_converter_name }}.allocationSize(value.{{ field_def.name() | typescript_var_name }})
          {%- if !loop.last %} +{% endif %}
        {% endfor %}
      );
    }
  }
  return new FFIConverter();
})();

{% endfor %}

// ==========
// Enum definitions:
// ==========

{% for enum_def in ci.enum_definitions() %}
{%- include "Enum.ts" %}
{% endfor %}

// ==========
// Object definitions:
// ==========

{% for object_def in ci.object_definitions() %}
export type {{ object_def.name() | typescript_protocol_name }} = {
  {% for method_def in object_def.methods() %}
    {%- call ts::docstring(method_def, 0) -%}
    {%- if method_def.is_async() -%}/* async */ {% endif -%}{{ method_def.name() | typescript_var_name }}(
      {%- call ts::param_list(method_def) -%}
    ){% call function_return_type_or_void(method_def) %};
  {% endfor %}
};

{% call ts::docstring(object_def, 0) %}
export class {{ object_def.name() | typescript_class_name }} extends UniffiAbstractObject implements {{ object_def.name() | typescript_protocol_name }} {
  readonly [uniffiTypeNameSymbol] = '{{ object_def.name() }}';
  readonly [destructorGuardSymbol]: UniffiRustArcPtr;
  readonly [pointerLiteralSymbol]: UnsafeMutableRawPointer;

  // Constructors:
  {% for constructor_fn in object_def.constructors() -%}
  {% call ts::docstring(constructor_fn, 0) %}
  {% if constructor_fn.is_primary_constructor() -%}
  constructor({%- call ts::param_list(constructor_fn) -%}) {
    super();

    {% for arg in constructor_fn.arguments() -%}
      let {{ arg.name() | typescript_argument_var_name }} = {{ arg.name() | typescript_var_name | typescript_ffi_converter_lower_with(arg.as_type().borrow()) }};
    {% endfor -%}

    const pointer = uniffiCaller.rustCall(
      /*caller:*/ (callStatus) => {
        return FFI_DYNAMIC_LIB.{{ constructor_fn.ffi_func().name() }}([
          {% for arg in constructor_fn.arguments() -%}
            {{ arg.name() | typescript_argument_var_name }}
            {%- if !loop.last %}, {% endif %}
          {%- endfor -%}

          {%- if constructor_fn.ffi_func().has_rust_call_status_arg() -%}
            {%- if !constructor_fn.arguments().is_empty() %}, {% endif -%}
            callStatus
          {%- endif %}
        ]);
      },
      /*liftString:*/ FfiConverterString.lift
    );

    this[pointerLiteralSymbol] = pointer;
    this[destructorGuardSymbol] = {{ object_def.name() | typescript_ffi_object_factory_name }}.bless(pointer);
  }
  {%- else %}
    static {{ constructor_fn.name() | typescript_var_name }}(
      {%- call ts::param_list(constructor_fn) -%}
    ){% call function_return_type_or_void(constructor_fn) %} {
      {%- call function_call_body(constructor_fn) -%}
    }
  {%- endif %}
  {%- endfor -%}

  // Methods:
  {% for method_def in object_def.methods() %}
    {% call ts::docstring(method_def, 0) %}
    {%- if method_def.is_async() -%}async {% endif -%}{{ method_def.name() | typescript_var_name }}(
      {%- call ts::param_list(method_def) -%}
    ){% call function_return_type_or_void(method_def) %} {
      {%- call function_call_body(method_def, object_def.name()) -%}
    }
  {% endfor %}

  /**
   * {@inheritDoc uniffi-bindgen-react-native#UniffiAbstractObject.uniffiDestroy}
   */
  uniffiDestroy(): void {
    const ptr = (this as any)[destructorGuardSymbol];
    if (typeof ptr !== 'undefined') {
      const pointer = {{ object_def.name() | typescript_ffi_object_factory_name }}.pointer(this);
      {{ object_def.name() | typescript_ffi_object_factory_name }}.freePointer(pointer);
      {{ object_def.name() | typescript_ffi_object_factory_name }}.unbless(ptr);
      delete (this as any)[destructorGuardSymbol];
    }
  }
  [Symbol.dispose] = this.uniffiDestroy

  static instanceOf(obj: any): obj is {{ object_def.name() | typescript_class_name }} {
    return {{ object_def.name() | typescript_ffi_object_factory_name }}.isConcreteType(obj);
  }

  // FIXME: maybe add `.equal(a, b)` static method like many protobuf libraries have?
  // FIXME: maybe add `.clone()` method?
}

const {{ object_def.name() | typescript_ffi_object_factory_name }}: UniffiObjectFactory<{{ object_def.name() | typescript_class_name }}> =
  (() => {
    /// <reference lib="es2021" />
    const registry =
      typeof (globalThis as any).FinalizationRegistry !== 'undefined'
        ? new (globalThis as any).FinalizationRegistry(
            (heldValue: UnsafeMutableRawPointer) => {
             {{ object_def.name() | typescript_ffi_object_factory_name }}.freePointer(heldValue);
            }
          )
        : null;

    return {
      create(pointer: UnsafeMutableRawPointer): {{ object_def.name() | typescript_class_name }} {
        const instance = Object.create({{ object_def.name() | typescript_class_name }}.prototype);
        instance[pointerLiteralSymbol] = pointer;
        instance[destructorGuardSymbol] = this.bless(pointer);
        instance[uniffiTypeNameSymbol] = '{{ object_def.name() }}';
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

      pointer(obj: {{ object_def.name() | typescript_class_name }}): UnsafeMutableRawPointer {
        if (typeof (obj as any)[destructorGuardSymbol] === 'undefined') {
          throw new UniffiInternalError.UnexpectedNullPointer();
        }
        return (obj as any)[pointerLiteralSymbol];
      },

      clonePointer(obj: {{ object_def.name() | typescript_class_name }}): UnsafeMutableRawPointer {
        const handleArg = this.pointer(obj);
        return uniffiCaller.rustCall(
          /*caller:*/ (callStatus) => {
            return FFI_DYNAMIC_LIB.{{ object_def.ffi_object_clone().name() }}([
              {% for arg in object_def.ffi_object_clone().arguments() -%}
                {{ arg.name() | typescript_argument_var_name }}
                {%- if !loop.last %}, {% endif %}
              {%- endfor -%}

              {%- if object_def.ffi_object_clone().has_rust_call_status_arg() -%}
                {%- if !object_def.ffi_object_clone().arguments().is_empty() %}, {% endif -%}
                callStatus
              {%- endif %}
            ]);
          },
          /*liftString:*/ FfiConverterString.lift
        );
      },

      freePointer(handleArg: UnsafeMutableRawPointer): void {
        uniffiCaller.rustCall(
          /*caller:*/ (callStatus) => {
            return FFI_DYNAMIC_LIB.{{ object_def.ffi_object_free().name() }}([
              {% for arg in object_def.ffi_object_free().arguments() -%}
                {{ arg.name() | typescript_argument_var_name }}
                {%- if !loop.last %}, {% endif %}
              {%- endfor -%}

              {%- if object_def.ffi_object_free().has_rust_call_status_arg() -%}
                {%- if !object_def.ffi_object_free().arguments().is_empty() %}, {% endif -%}
                callStatus
              {%- endif %}
            ]);
          },
          /*liftString:*/ FfiConverterString.lift
        );
      },

      isConcreteType(obj: any): obj is {{ object_def.name() | typescript_class_name }} {
        return (
          obj[destructorGuardSymbol] && obj[uniffiTypeNameSymbol] === '{{ object_def.name() }}'
        );
      },
    };
  })();

// FfiConverter for TodoListInterface
const {{ object_def.name() | typescript_ffi_converter_struct_enum_object_name }} = new FfiConverterObject(
  {{ object_def.name() | typescript_ffi_object_factory_name }}
);

{% endfor %}

// ==========
// Function definitions:
// ==========

{% for func_def in ci.function_definitions() %}
{% call ts::docstring(func_def, 0) %}
export {% if func_def.is_async() %}async {% endif %}function {{ func_def.name() | typescript_fn_name }}(
  {%- call ts::param_list(func_def) -%}
){%- if let Some(ret_type) = func_def.return_type() -%}: {% if func_def.is_async() -%}
  Promise<{%- endif -%}{{ ret_type | typescript_type_name }}{%- if func_def.is_async() -%}>{%- endif -%}
{%- endif %} {
  {%- call function_call_body(func_def) -%}
}

{% endfor %}
