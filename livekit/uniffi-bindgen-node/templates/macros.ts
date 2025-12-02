{% macro param_list(func) %}
	{%- for arg in func.arguments() -%}
	    {%- let type_ = arg.as_type() -%}
	    {{ arg.name() | typescript_var_name }}: {{ arg | typescript_type_name }}
		{%- if !loop.last %}, {% endif -%}
	{%- endfor -%}
  {%- if func.is_async() -%}
    {%- if !func.arguments().is_empty() %}, {% endif -%}
    asyncOpts_?: { signal: AbortSignal }
  {%- endif -%}
{%- endmacro %}

{%- macro docstring(defn, indent_level) %}
{%- match defn.docstring() %}
{%- when Some(s) %}
{{ s | typescript_docstring(indent_level) }}
{%- else %}
{%- endmatch %}
{%- endmacro %}

{%- macro import_file_path(file_name) -%}
  {{- file_name -}}
  {%- match out_import_extension -%}
    {%- when ImportExtension::None -%}
      {# explicitly empty #}
    {%- when ImportExtension::Ts -%}
      .ts
    {%- when ImportExtension::Js -%}
      .js
  {%- endmatch -%}
{%- endmacro -%}
