{%- import "macros.ts" as ts -%}

export * from './{%- call ts::import_file_path(node_ts_main_file_name) -%}';

{% if out_lib_disable_auto_loading %}
export { uniffiLoad, uniffiUnload } from './{%- call ts::import_file_path(sys_ts_main_file_name) -%}';
{% endif %}
