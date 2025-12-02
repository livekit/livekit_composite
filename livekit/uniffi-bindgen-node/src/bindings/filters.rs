// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

use askama::Result;
use heck::{ToLowerCamelCase, ToPascalCase, ToUpperCamelCase};
use uniffi_bindgen::interface::{AsType, FfiType, Type};

fn strip_comments(input: impl AsRef<str>) -> String {
    input.as_ref().replace("/* ", "").replace(" */", "")
}

pub fn typescript_type_name(typ: &impl AsType, askama_values: &dyn askama::Values) -> Result<String> {
    Ok(match typ.as_type() {
        Type::Int8 => "/*i8*/number".into(),
        Type::Int16 => "/*i16*/number".into(),
        Type::Int32 => "/*i32*/number".into(),
        Type::Int64 => "/*i64*/bigint".into(),
        Type::UInt8 => "/*u8*/number".into(),
        Type::UInt16 => "/*u16*/number".into(),
        Type::UInt32 => "/*u32*/number".into(),
        Type::UInt64 => "/*u64*/bigint".into(),
        Type::Float32 => "/*f32*/number".into(),
        Type::Float64 => "/*f64*/number".into(), // FIXME: is this right for f64? I am not sure `number` is big enough?
        Type::Boolean => "boolean".into(),
        Type::String => "string".into(),
        Type::Bytes => "ArrayBuffer".into(),
        Type::Timestamp => "Date".into(),
        Type::Duration => "number /* in milliseconds */".into(), // ref: https://github.com/jhugman/uniffi-bindgen-react-native/blob/b9301797ef697331d29edb9d2402ea35c218571e/crates/ubrn_bindgen/src/bindings/gen_typescript/miscellany.rs#L31
        Type::Enum { name, .. } | Type::Record { name, .. } => name.to_pascal_case(),
        Type::Object { name, .. } => typescript_class_name(&name, askama_values)?,
        Type::CallbackInterface { name, .. } => name.to_lower_camel_case(),
        Type::Optional { inner_type } => {
            format!("{} | undefined", typescript_type_name(&inner_type, askama_values)?)
        }
        Type::Sequence { inner_type } => format!("Array<{}>", typescript_type_name(&inner_type, askama_values)?),
        Type::Map {
            key_type,
            value_type,
        } => format!(
            "Map<{}, {}>",
            typescript_type_name(&key_type, askama_values)?,
            typescript_type_name(&value_type, askama_values)?,
        ),
        Type::Custom { name, .. } => name.to_pascal_case(),
    })
}

pub fn typescript_ffi_type_name(ffi_type: &FfiType, askama_values: &dyn askama::Values) -> Result<String> {
    Ok(match ffi_type {
        FfiType::Int8 => "number".into(),
        FfiType::Int16 => "number".into(),
        FfiType::Int32 => "number".into(),
        FfiType::Int64 => "bigint".into(),
        FfiType::UInt8 => "number".into(),
        FfiType::UInt16 => "number".into(),
        FfiType::UInt32 => "number".into(),
        FfiType::UInt64 => "bigint".into(),
        FfiType::Float32 => "number".into(),
        FfiType::Float64 => "number".into(), // FIXME: is this right for f64? I am not sure `number` is big enough?
        FfiType::RustBuffer(_) => "/* RustBuffer */ UniffiRustBufferStruct".into(),
        FfiType::ForeignBytes => "UniffiForeignBytes".into(),
        FfiType::Callback(name) => format!("/* callback {} */ JsExternal", typescript_callback_name(name, askama_values)?),
        FfiType::Struct(name) => typescript_ffi_struct_name(name, askama_values)?,
        FfiType::Handle => "/* handle */ bigint".into(),
        FfiType::RustCallStatus => "/* RustCallStatus */ JsExternal".into(),
        FfiType::MutReference(inner) => format!("/* MutReference to {} */ JsExternal", strip_comments(typescript_ffi_type_name(inner, askama_values)?)),
        FfiType::Reference(inner) => format!("/* Reference to {} */ JsExternal", strip_comments(typescript_ffi_type_name(inner, askama_values)?)),
        FfiType::VoidPointer => "void".into(), // ???
    })
}

pub fn typescript_ffi_datatype_name(ffi_type: &FfiType, askama_values: &dyn askama::Values) -> Result<String> {
    Ok(match ffi_type {
        FfiType::Int8 => "/* i8 */ DataType.U8".into(),
        FfiType::Int16 => "DataType.I16".into(),
        FfiType::Int32 => "DataType.I32".into(),
        FfiType::Int64 => "DataType.I64".into(),
        FfiType::UInt8 => "DataType.U8".into(),
        FfiType::UInt16 => "/* u16 */ DataType.U64".into(),
        FfiType::UInt32 => "/* u32 */ DataType.U64".into(),
        FfiType::UInt64 => "DataType.U64".into(),
        FfiType::Float32 => "/* f32 */ DataType.Float".into(),
        FfiType::Float64 => "/* f64 */ DataType.Double".into(), // FIXME: is this right for f64? I am not sure `number` is big enough?
        FfiType::RustBuffer(_) => "DataType_UniffiRustBufferStruct".into(),
        FfiType::ForeignBytes => "DataType_UniffiForeignBytes".into(),
        FfiType::Callback(_name) => "/* callback */ DataType.External".into(),
        FfiType::Struct(name) => format!("/* {} */ DataType.U8Array", typescript_ffi_struct_name(name, askama_values)?), // FIXME: this should make struct definitions in ffi-rs
        FfiType::Handle => "/* handle */ DataType.U64".into(),
        FfiType::RustCallStatus => "/* RustCallStatus */ DataType.External".into(),
        FfiType::MutReference(inner) => format!("/* MutReference to {} */ DataType.External", strip_comments(typescript_ffi_type_name(inner, askama_values)?)),
        FfiType::Reference(inner) => format!("/* Reference to {} */ DataType.External", strip_comments(typescript_ffi_type_name(inner, askama_values)?)),
        FfiType::VoidPointer => "DataType.Void".into(), // ???
    })
}

pub fn typescript_ffi_converter_name(typ: &impl AsType, askama_values: &dyn askama::Values) -> Result<String> {
    Ok(match typ.as_type() {
        Type::Int8 => "FfiConverterInt8".into(),
        Type::Int16 => "FfiConverterInt16".into(),
        Type::Int32 => "FfiConverterInt32".into(),
        Type::Int64 => "FfiConverterInt64".into(),
        Type::UInt8 => "FfiConverterUInt8".into(),
        Type::UInt16 => "FfiConverterUInt16".into(),
        Type::UInt32 => "FfiConverterUInt32".into(),
        Type::UInt64 => "FfiConverterUInt64".into(),
        Type::Float32 => "FfiConverterFloat32".into(),
        Type::Float64 => "FfiConverterFloat64".into(),
        Type::Boolean => "FfiConverterBool".into(),
        Type::String => "FfiConverterString".into(),
        Type::Bytes => "FfiConverterBytes".into(),
        Type::Timestamp => "FfiConverterTimestamp".into(),
        Type::Duration => "FfiConverterDuration".into(),
        Type::Enum { name, .. } | Type::Record { name, .. } | Type::Object { name, .. } => typescript_ffi_converter_struct_enum_object_name(&name, askama_values)?,
        Type::CallbackInterface { name, .. } => name.to_lower_camel_case(),
        Type::Optional { inner_type } => {
            format!("(new FfiConverterOptional({}))", typescript_ffi_converter_name(&inner_type, askama_values)?)
        }
        Type::Sequence { inner_type } => format!("(new FfiConverterArray({}))", typescript_ffi_converter_name(&inner_type, askama_values)?),
        Type::Map {
            key_type,
            value_type,
        } => format!(
            "(new FfiConverterMap({}, {}))",
            typescript_ffi_converter_name(&key_type, askama_values)?,
            typescript_ffi_converter_name(&value_type, askama_values)?,
        ),
        Type::Custom { name, .. } => format!("/* custom? */ {}", name.to_pascal_case()), // FIXME: what should this be?
    })
}

pub fn typescript_ffi_converter_lift_with(target: String, askama_values: &dyn askama::Values, typ: &impl AsType) -> Result<String> {
    Ok(match typ.as_type() {
        Type::String | Type::Map { .. } | Type::Sequence { .. } | Type::Enum { .. } | Type::Record { .. } => {
            format!("{}.lift(new UniffiRustBufferValue({target}).consumeIntoUint8Array())", typescript_ffi_converter_name(typ, askama_values)?)
        },
        Type::Optional { inner_type } => {
            format!("new FfiConverterOptional({}).lift(new UniffiRustBufferValue({target}).consumeIntoUint8Array())", typescript_ffi_converter_name(&inner_type, askama_values)?)
        },
        _ => format!("{}.lift({target})", typescript_ffi_converter_name(typ, askama_values)?),
    })
}

pub fn typescript_ffi_converter_lower_with(target: String, askama_values: &dyn askama::Values, typ: &impl AsType) -> Result<String> {
    Ok(match typ.as_type() {
        Type::String | Type::Map { .. } | Type::Sequence { .. } | Type::Enum { .. } | Type::Record { .. } => {
            format!("UniffiRustBufferValue.allocateWithBytes({}.lower({target})).toStruct()", typescript_ffi_converter_name(typ, askama_values)?)
        },
        Type::Optional { inner_type } => {
            format!("UniffiRustBufferValue.allocateWithBytes(new FfiConverterOptional({}).lower({target})).toStruct()", typescript_ffi_converter_name(&inner_type, askama_values)?)
        },
        _ => format!("{}.lower({target})", typescript_ffi_converter_name(typ, askama_values)?),
    })
}

pub fn typescript_fn_name(raw_name: &str, _: &dyn askama::Values) -> Result<String> {
    Ok(raw_name.to_lower_camel_case())
}

pub fn typescript_var_name(raw_name: &str, _: &dyn askama::Values) -> Result<String> {
    Ok(raw_name.to_lower_camel_case())
}

/// The name of a given argument to a extern c ffi function call
pub fn typescript_argument_var_name(raw_name: &str, values: &dyn askama::Values) -> Result<String> {
    Ok(format!("{}Arg", typescript_var_name(raw_name, values)?))
}

pub fn typescript_class_name(raw_name: &str, _: &dyn askama::Values) -> Result<String> {
    Ok(raw_name.to_pascal_case())
}

pub fn typescript_protocol_name(raw_name: &str, values: &dyn askama::Values) -> Result<String> {
    Ok(format!("{}Interface", typescript_class_name(raw_name, values)?))
}

pub fn typescript_ffi_struct_name(raw_name: &str, _: &dyn askama::Values) -> Result<String> {
    Ok(format!("Uniffi{}", raw_name.to_upper_camel_case()))
}

pub fn typescript_callback_name(raw_name: &str, _: &dyn askama::Values) -> Result<String> {
    Ok(format!("UniffiCallback{}", raw_name.to_upper_camel_case()))
}

pub fn typescript_ffi_converter_struct_enum_object_name(struct_name: &str, _: &dyn askama::Values) -> Result<String> {
    Ok(format!("FfiConverterType{}", struct_name.to_upper_camel_case()))
}

pub fn typescript_ffi_object_factory_name(object_name: &str, values: &dyn askama::Values) -> Result<String> {
    Ok(format!("uniffiType{}ObjectFactory", typescript_class_name(object_name, values)?))
}

pub fn typescript_docstring(s: &str, _: &dyn askama::Values, level: &i32) -> Result<String> {
    let contents = textwrap::indent(&textwrap::dedent(s), " * ");
    let comment = format!("/**\n{contents}\n */");
    Ok(textwrap::indent(&comment, &" ".repeat(*level as usize)))
}
