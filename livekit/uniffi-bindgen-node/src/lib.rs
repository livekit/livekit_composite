// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

use anyhow::{Context, Result};
use camino::Utf8PathBuf;
use clap::Parser;

mod bindings;
mod utils;

#[derive(Debug, Clone, Default, clap::ValueEnum)]
enum OutputDirnameApi {
    #[default]
    Dirname,
    ImportMetaUrl,
}

impl Into<bindings::utils::DirnameApi> for OutputDirnameApi {
    fn into(self) -> bindings::utils::DirnameApi {
        match self {
            OutputDirnameApi::ImportMetaUrl => bindings::utils::DirnameApi::ImportMetaUrl,
            OutputDirnameApi::Dirname => bindings::utils::DirnameApi::Dirname,
        }
    }
}

#[derive(Debug, Clone, Default, clap::ValueEnum)]
enum OutputImportExtension {
    #[default]
    None,
    Ts,
    Js,
}

impl Into<bindings::utils::ImportExtension> for OutputImportExtension {
    fn into(self) -> bindings::utils::ImportExtension {
        match self {
            OutputImportExtension::None => bindings::utils::ImportExtension::None,
            OutputImportExtension::Ts => bindings::utils::ImportExtension::Ts,
            OutputImportExtension::Js => bindings::utils::ImportExtension::Js,
        }
    }
}

/// UniFFI binding generator for Node.js
#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
pub struct Args {
    /// Path to the compiled library (.so, .dylib, or .dll).
    lib_source: Utf8PathBuf,

    /// Output directory.
    #[arg(short, long, default_value = "./output")]
    out_dir: Utf8PathBuf,

    /// Name of the crate.
    #[arg(long)]
    crate_name: String,

    /// The set of buildin apis which should be used to get the current
    /// directory - `__dirname` or `import.meta.url`.
    #[arg(long, value_enum, default_value_t=OutputDirnameApi::default())]
    out_dirname_api: OutputDirnameApi,

    /// If specified, the dylib/so/dll native dependency won't be automatically loaded
    /// when the bindgen is imported. If this flag is set, explicit `uniffiLoad` / `uniffiUnload`
    /// will be exported from the generated package which must be called before any uniffi calls
    /// are made.
    ///
    /// Use this if you want to only load a bindgen sometimes (ie, it is an optional dependency).
    #[arg(long, action)]
    out_disable_auto_load_lib: bool,

    /// Changes the extension used in `import`s within the final generated output. This exists
    /// because depending on packaging / tsc configuration, the import path extensions may be
    /// expected to end in different extensions. For example, tsc often requires .js extensions
    /// on .ts files it imports, etc.
    #[arg(long, action, value_enum, default_value_t=OutputImportExtension::default())]
    out_import_extension: OutputImportExtension,

    /// Config file override.
    #[arg(short, long)]
    config_override: Option<Utf8PathBuf>,
}

pub fn run(args: Args) -> Result<()> {
    let config_supplier = {
        use uniffi_bindgen::cargo_metadata::CrateConfigSupplier;
        let cmd = ::cargo_metadata::MetadataCommand::new();
        let metadata = cmd.exec().context("error running cargo metadata")?;
        CrateConfigSupplier::from(metadata)
    };
    let node_binding_generator = bindings::NodeBindingGenerator::new(
        args.out_dirname_api.into(),
        args.out_disable_auto_load_lib,
        args.out_import_extension.into(),
    );

    uniffi_bindgen::library_mode::generate_bindings(
        &args.lib_source,
        args.crate_name.into(),
        &node_binding_generator,
        &config_supplier,
        args.config_override.as_deref(),
        &args.out_dir,
        false,
    )
    .context("Failed to generate node bindings in library mode")?;

    // To read from udl file, do something like the below instead:
    // uniffi_bindgen::generate_external_bindings(
    //     &CppBindingGenerator {
    //         scaffolding_mode: args.scaffolding_mode,
    //     },
    //     args.source,
    //     args.config.as_deref(),
    //     args.out_dir,
    //     args.lib_file,
    //     args.crate_name.as_deref(),
    //     false,
    // )

    Ok(())
}
