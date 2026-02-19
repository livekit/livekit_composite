// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

use std::borrow::Borrow;
use uniffi_bindgen::{ComponentInterface, interface::{AsType, FfiDefinition, FfiType, Type, Callable}};
use anyhow::{Context, Result};
use askama::Template;
use heck::ToKebabCase;

use crate::bindings::{filters, utils::{DirnameApi, ImportExtension, LibPath, LibPathSwitchToken}};

pub struct Bindings {
    pub package_json_contents: String,
    pub sys_ts_template_contents: String,
    pub node_ts_file_contents: String,
    pub index_ts_file_contents: String,
}

#[derive(Template)]
#[template(escape = "none", path = "package.json")]
struct PackageJsonTemplate<'ci> {
    ci: &'ci ComponentInterface,
    out_node_version: String,
    out_lib_path: LibPath,
}

impl<'ci> PackageJsonTemplate<'ci> {
    pub fn new(ci: &'ci ComponentInterface, out_node_version: &str, out_lib_path: LibPath) -> Self {
        Self { ci, out_node_version: out_node_version.into(), out_lib_path }
    }
}

#[derive(Template)]
#[template(escape = "none", path = "sys.ts")]
struct SysTemplate<'ci> {
    ci: &'ci ComponentInterface,

    out_dirname_api: DirnameApi,
    out_lib_disable_auto_loading: bool,
    out_verbose_logs: bool,
    out_lib_path: LibPath,
}

impl<'ci> SysTemplate<'ci> {
    pub fn new(
        ci: &'ci ComponentInterface,
        out_dirname_api: DirnameApi,
        out_lib_disable_auto_loading: bool,
        out_verbose_logs: bool,
        out_lib_path: LibPath,
    ) -> Self {
        Self {
            ci,
            out_dirname_api,
            out_lib_disable_auto_loading,
            out_verbose_logs,
            out_lib_path,
        }
    }
}


#[derive(Template)]
#[template(escape = "none", path = "node.ts")]
struct NodeTsTemplate<'ci> {
    ci: &'ci ComponentInterface,
    sys_ts_main_file_name: String,
    out_import_extension: ImportExtension,
    out_verbose_logs: bool,
}

impl<'ci> NodeTsTemplate<'ci> {
    pub fn new(
        ci: &'ci ComponentInterface,
        sys_ts_main_file_name: &str,
        out_import_extension: ImportExtension,
        out_verbose_logs: bool,
    ) -> Self {
        Self {
            ci,
            sys_ts_main_file_name: sys_ts_main_file_name.to_string(),
            out_import_extension,
            out_verbose_logs,
        }
    }
}

#[derive(Template)]
#[template(escape = "none", path = "index.ts")]
struct IndexTsTemplate {
    node_ts_main_file_name: String,
    sys_ts_main_file_name: String,
    out_import_extension: ImportExtension,
    out_lib_disable_auto_loading: bool,
}

impl IndexTsTemplate {
    pub fn new(
        node_ts_main_file_name: &str,
        sys_ts_main_file_name: &str,
        out_import_extension: ImportExtension,
        out_lib_disable_auto_loading: bool,
    ) -> Self {
        Self {
            node_ts_main_file_name: node_ts_main_file_name.to_string(),
            sys_ts_main_file_name: sys_ts_main_file_name.to_string(),
            out_import_extension,
            out_lib_disable_auto_loading,
        }
    }
}

/// Options required to pass to [generate_node_bindings] invocations.
#[derive(Debug)]
pub struct GenerateNodeBindingsOptions<'a> {
    pub sys_ts_main_file_name: &'a str,
    pub node_ts_main_file_name: &'a str,
    pub out_dirname_api: DirnameApi,
    pub out_lib_disable_auto_loading: bool,
    pub out_import_extension: ImportExtension,
    pub out_node_version: &'a str,
    pub out_verbose_logs: bool,
    pub out_lib_path: LibPath,
}

pub fn generate_node_bindings(
    ci: &ComponentInterface,
    options: GenerateNodeBindingsOptions<'_>,
) -> Result<Bindings> {
    let package_json_contents = PackageJsonTemplate::new(ci, options.out_node_version, options.out_lib_path.clone()).render().context("failed to render package.json template")?;
    let sys_ts_template_contents = SysTemplate::new(ci, options.out_dirname_api, options.out_lib_disable_auto_loading, options.out_verbose_logs, options.out_lib_path.clone()).render().context("failed to render sys.ts template")?;
    let node_ts_file_contents = NodeTsTemplate::new(ci, options.sys_ts_main_file_name, options.out_import_extension.clone(), options.out_verbose_logs).render().context("failed to render node.ts template")?;
    let index_ts_file_contents = IndexTsTemplate::new(options.node_ts_main_file_name, options.sys_ts_main_file_name, options.out_import_extension, options.out_lib_disable_auto_loading).render().context("failed to render index.ts template")?;

    Ok(Bindings {
        package_json_contents,
        sys_ts_template_contents,
        node_ts_file_contents,
        index_ts_file_contents,
    })
}
