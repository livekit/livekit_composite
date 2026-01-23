{# TODO: doc comments for variant fields #}
{%- macro variant_inner_fields(variant) %}Readonly<
{%-   if !variant.has_nameless_fields() %}{
{%-     for field in variant.fields() %}
{{-       field.name() | typescript_var_name }}: {{ field | typescript_type_name }}
{%-       if !loop.last %}; {% endif -%}
{%-     endfor %}}
{%-   else %}[
{%-     for field in variant.fields() %}
{{-       field | typescript_type_name }}
{%-       if !loop.last %}, {% endif -%}
{%-     endfor %}]
{%-   endif %}>
{%- endmacro %}

{%- call ts::docstring(enum_def, 0) %}
export type {{ enum_def.name() | typescript_class_name }} =
    {%- for variant in enum_def.variants() %}
    {%- let variant_name = variant.name() | typescript_var_name %}
    {%- call ts::docstring(variant, 4) %}
    {% if enum_def.is_flat() -%}
    | "{{ variant_name }}"
    {%- else -%}
    | {
        tag: "{{ variant_name }}"
        {%- if !variant.fields().is_empty() %},
        inner: {% call variant_inner_fields(variant) %}
        {%- endif %}
    }
    {%- endif -%}
    {%- endfor %}

export const {{ enum_def.name() | typescript_ffi_converter_struct_enum_object_name }} = (() => {
    const ordinalConverter = FfiConverterInt32;
    {%- let type_name = enum_def.name() | typescript_class_name %}
    class FFIConverter extends AbstractFfiConverterByteArray<{{ type_name }}> {
        read(from: RustBuffer): {{ type_name }} {
            {% if enum_def.is_flat() -%}
            switch (ordinalConverter.read(from)) {
                {%- for variant in enum_def.variants() %}
                {%- let variant_name = variant.name() | typescript_var_name %}
                case {{ loop.index0 + 1 }}: return "{{ variant_name }}";
                {%- endfor %}
                default: throw new UniffiInternalError.UnexpectedEnumCase();
            }
            {%- else -%}
            switch (ordinalConverter.read(from)) {
                {%- for variant in enum_def.variants() %}
                {%- let variant_name = variant.name() | typescript_var_name %}
                case {{ loop.index0 + 1 }}:
                    return {
                        tag: "{{ variant_name }}"
                        {%- if !variant.fields().is_empty() %},
                        inner: {% if !variant.has_nameless_fields() -%} {
                            {%- for field in variant.fields() %}
                            {{ field.name() | typescript_var_name }}: {{ field.as_type().borrow() | typescript_ffi_converter_name }}.read(from)
                            {%- if !loop.last %}, {% endif -%}
                            {%- endfor %}
                        }
                        {%- else -%} [
                            {%- for field in variant.fields() %}
                            {{ field.as_type().borrow() | typescript_ffi_converter_name }}.read(from)
                            {%- if !loop.last %}, {% endif -%}
                            {%- endfor %}
                        ]
                        {%- endif %}
                        {%- endif %}
                    };
                {%- endfor %}
                default: throw new UniffiInternalError.UnexpectedEnumCase();
            }
            {%- endif %}
        }
        write(value: {{ type_name }}, into: RustBuffer): void {
            {% if enum_def.is_flat() -%}
            switch (value) {
                {%- for variant in enum_def.variants() %}
                {%- let variant_name = variant.name() | typescript_var_name %}
                case "{{ variant_name }}": ordinalConverter.write({{ loop.index0 + 1 }}, into); break;
                {%- endfor %}
                default: throw new UniffiInternalError.UnexpectedEnumCase();
            }
            {%- else -%}
            switch (value.tag) {
                {%- for variant in enum_def.variants() %}
                {%- let variant_name = variant.name() | typescript_var_name %}
                case "{{ variant_name }}":
                    ordinalConverter.write({{ loop.index0 + 1 }}, into);
                    {%- for field in variant.fields() %}
                    {% let converter_name = field.as_type().borrow() | typescript_ffi_converter_name %}
                    {%- if !variant.has_nameless_fields() -%}
                    {{ converter_name }}.write(value.inner.{{ field.name() | typescript_var_name }}, into);
                    {%- else -%}
                    {{ converter_name }}.write(value.inner[{{ loop.index0 }}], into);
                    {%- endif -%}
                    {%- endfor %}
                    break;
                {%- endfor %}
                default: throw new UniffiInternalError.UnexpectedEnumCase();
            }
            {%- endif %}
        }
        allocationSize(value: {{ type_name }}): number {
            {% if enum_def.is_flat() -%}
            return ordinalConverter.allocationSize(0);
            {%- else -%}
            switch (value.tag) {
                {%- for variant in enum_def.variants() %}
                {%- let variant_name = variant.name() | typescript_var_name %}
                case "{{ variant_name }}":
                    return ordinalConverter.allocationSize({{ loop.index }})
                    {%- for field in variant.fields() -%}
                        {% let converter_name = field.as_type().borrow() | typescript_ffi_converter_name %}
                        + {{ converter_name }}.allocationSize(
                            {%- if !variant.has_nameless_fields() -%}
                            value.inner.{{ field.name() | typescript_var_name }}
                            {%- else -%}
                            value.inner[{{ loop.index0 }}]
                            {%- endif -%}
                        )
                    {%- endfor -%};
                {%- endfor %}
                default: throw new UniffiInternalError.UnexpectedEnumCase();
            }
            {%- endif %}
        }
    }
    return new FFIConverter();
})();