// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

use std::borrow::Borrow;
use uniffi_bindgen::{ComponentInterface, interface::{AsType, FfiDefinition, FfiType, Type, Callable}};
use anyhow::{Context, Result};
use askama::Template;
use heck::ToKebabCase;

use crate::bindings::{filters, utils::{DirnameApi, ImportExtension}};

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
}

impl<'ci> PackageJsonTemplate<'ci> {
    pub fn new(ci: &'ci ComponentInterface) -> Self {
        Self { ci }
    }
}

#[derive(Template)]
#[template(escape = "none", path = "sys.ts")]
struct SysTemplate<'ci> {
    ci: &'ci ComponentInterface,

    out_dirname_api: DirnameApi,
    out_disable_auto_loading_lib: bool,
}

impl<'ci> SysTemplate<'ci> {
    pub fn new(
        ci: &'ci ComponentInterface,
        out_dirname_api: DirnameApi,
        out_disable_auto_loading_lib: bool,
    ) -> Self {
        Self { ci, out_dirname_api, out_disable_auto_loading_lib }
    }
}


#[derive(Template)]
#[template(escape = "none", path = "node.ts")]
struct NodeTsTemplate<'ci> {
    ci: &'ci ComponentInterface,
    sys_ts_main_file_name: String,
    out_import_extension: ImportExtension,
}

impl<'ci> NodeTsTemplate<'ci> {
    pub fn new(
        ci: &'ci ComponentInterface,
        sys_ts_main_file_name: &str,
        out_import_extension: ImportExtension
    ) -> Self {
        Self {
            ci,
            sys_ts_main_file_name: sys_ts_main_file_name.to_string(),
            out_import_extension,
        }
    }
}

#[derive(Template)]
#[template(escape = "none", path = "index.ts")]
struct IndexTsTemplate {
    node_ts_main_file_name: String,
    sys_ts_main_file_name: String,
    out_import_extension: ImportExtension,
    out_disable_auto_loading_lib: bool,
}

impl IndexTsTemplate {
    pub fn new(
        node_ts_main_file_name: &str,
        sys_ts_main_file_name: &str,
        out_import_extension: ImportExtension,
        out_disable_auto_loading_lib: bool,
    ) -> Self {
        Self {
            node_ts_main_file_name: node_ts_main_file_name.to_string(),
            sys_ts_main_file_name: sys_ts_main_file_name.to_string(),
            out_import_extension,
            out_disable_auto_loading_lib,
        }
    }
}

pub fn generate_node_bindings(
    ci: &ComponentInterface,
    sys_ts_main_file_name: &str,
    node_ts_main_file_name: &str,
    out_dirname_api: DirnameApi,
    out_disable_auto_loading_lib: bool,
    out_import_extension: ImportExtension,
) -> Result<Bindings> {
    let package_json_contents = PackageJsonTemplate::new(ci).render().context("failed to render package.json template")?;
    let sys_template_contents = SysTemplate::new(ci, out_dirname_api, out_disable_auto_loading_lib).render().context("failed to render sys.ts template")?;
    let node_ts_file_contents = NodeTsTemplate::new(ci, sys_ts_main_file_name, out_import_extension.clone()).render().context("failed to render node.ts template")?;
    let index_ts_file_contents = IndexTsTemplate::new(node_ts_main_file_name, sys_ts_main_file_name, out_import_extension, out_disable_auto_loading_lib).render().context("failed to render index.ts template")?;

    Ok(Bindings {
        package_json_contents,
        sys_ts_template_contents: sys_template_contents,
        node_ts_file_contents,
        index_ts_file_contents,
    })
}
