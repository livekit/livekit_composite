// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

use heck::ToKebabCase;
use uniffi_bindgen::{BindingGenerator, GenerationSettings};
use anyhow::Result;
use serde::Deserialize;

mod generator;
mod filters;
pub mod utils;

use crate::{bindings::generator::{generate_node_bindings, Bindings}, utils::write_with_dirs};

pub struct NodeBindingGenerator {
    out_dirname_api: utils::DirnameApi,
    out_disable_auto_loading_lib: bool,
    out_import_extension: utils::ImportExtension,
}

impl NodeBindingGenerator {
    pub fn new(
        out_dirname_api: utils::DirnameApi,
        out_disable_auto_loading_lib: bool,
        out_import_extension: utils::ImportExtension,
    ) -> Self {
        Self { out_dirname_api, out_disable_auto_loading_lib, out_import_extension }
    }
}

#[derive(Default, Deserialize)]
pub struct NodeBindingGeneratorConfig {
    // TODO: Add Node-specific configuration options.
}

impl BindingGenerator for NodeBindingGenerator {
    type Config = NodeBindingGeneratorConfig;

    fn new_config(&self, root_toml: &toml::Value) -> Result<Self::Config> {
        Ok(match root_toml.get("bindings").and_then(|b| b.get("node")) {
            Some(v) => v.clone().try_into()?,
            None => Default::default(),
        })
    }

    fn update_component_configs(
        &self,
        _settings: &GenerationSettings,
        _components: &mut Vec<uniffi_bindgen::Component<Self::Config>>,
    ) -> Result<()> {
        return Ok(());
    }

    fn write_bindings(
        &self,
        settings: &GenerationSettings,
        components: &[uniffi_bindgen::Component<Self::Config>],
    ) -> Result<()> {
        for uniffi_bindgen::Component { ci, config: _, .. } in components {
            let sys_ts_main_file_name = format!("{}-sys", ci.namespace().to_kebab_case());
            let node_ts_main_file_name = format!("{}-node", ci.namespace().to_kebab_case());

            let Bindings {
                package_json_contents,
                sys_ts_template_contents,
                node_ts_file_contents,
                index_ts_file_contents,
            } = generate_node_bindings(
                &ci,
                sys_ts_main_file_name.as_str(),
                node_ts_main_file_name.as_str(),
                self.out_dirname_api.clone(),
                self.out_disable_auto_loading_lib,
                self.out_import_extension.clone(),
            )?;

            let package_json_path = settings.out_dir.join("package.json");
            write_with_dirs(&package_json_path, package_json_contents)?;

            let node_ts_file_path = settings.out_dir.join(format!("{node_ts_main_file_name}.ts"));
            write_with_dirs(&node_ts_file_path, node_ts_file_contents)?;

            let sys_template_path = settings.out_dir.join(format!("{sys_ts_main_file_name}.ts"));
            write_with_dirs(&sys_template_path, sys_ts_template_contents)?;

            let index_template_path = settings.out_dir.join("index.ts");
            write_with_dirs(&index_template_path, index_ts_file_contents)?;
        }

        Ok(())
    }
}
