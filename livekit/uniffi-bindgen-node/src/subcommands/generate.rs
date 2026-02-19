// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

use camino::Utf8PathBuf;
use clap::Args;
use anyhow::{Context, Result};

use crate::bindings::{self, utils};

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

#[derive(Args, Debug)]
pub struct GenerateSubcommandArgs {
    /// Path to the compiled library (.so, .dylib, or .dll).
    lib_source: Utf8PathBuf,

    /// Output directory.
    #[arg(short, long, default_value = "./output")]
    out_dir: Utf8PathBuf,

    /// Name of the crate.
    #[arg(long)]
    crate_name: String,

    /// The set of builtin apis which should be used to get the current
    /// directory - `__dirname` or `import.meta.url`.
    #[arg(long, value_enum, default_value_t=OutputDirnameApi::default())]
    out_dirname_api: OutputDirnameApi,

    /// Changes the extension used in `import`s within the final generated output. This exists
    /// because depending on packaging / tsc configuration, the import path extensions may be
    /// expected to end in different extensions. For example, tsc often requires .js extensions
    /// on .ts files it imports, etc.
    #[arg(long, action, value_enum, default_value_t=OutputImportExtension::default())]
    out_import_extension: OutputImportExtension,

    /// Specifies the version (in semver) of node that the typescript bindings will depend on in
    /// the built output. By default, this is "^18".
    #[arg(long, default_value = "^18")]
    out_node_version: String,

    /// If specified, the dylib/so/dll native dependency won't be automatically loaded
    /// when the bindgen is imported. If this flag is set, explicit `uniffiLoad` / `uniffiUnload`
    /// will be exported from the generated package which must be called before any uniffi calls
    /// are made.
    ///
    /// Use this if you want to only load a bindgen sometimes (ie, it is an optional dependency).
    #[arg(long, action)]
    out_lib_disable_auto_load: bool,

    /// The relative path to the built lib from the root of the package.
    /// By default, this is assumed to be `./<lib-source file name>`.
    #[arg(long, default_value=None, conflicts_with="out_lib_path_module")]
    out_lib_path_literal: Option<Utf8PathBuf>,

    /// The import path to a typescript module that exports a
    /// function. This function, when called, should return an object containing a path key mapping
    /// to an absolute path to the built lib.
    ///
    /// For example, the below would be a compliant module:
    /// > export default () => ({ path: "/path/to/my/built.dylib" });
    ///
    /// This parameter can be included multiple times, and if so, the first module that can be
    /// successfully imported will be queried to get the lib path. This can be used when building
    /// a package intended to be published to production with a series of `optionalDependencies`,
    /// each associated with a given os/arch to bundle native dependencies into a published
    /// package. ie, `--out-lib-path-module @my/package --out-lib-path-module ./path/to/my/fallback.ts`
    ///
    /// This parameter can also be set to a json object which allows for more complex scenarios
    /// where one package will be only attempted if a given platform / arch match. ie,
    /// `--out-lib-path-module '{"module": "@my/package", "version": "0.0.1", "platform": "darwin", "arch": "x86"}' --out-lib-path-module ./path/to/my/fallback.ts`
    ///
    /// By default, this is is disabled in lieu of `out-lib-path-literal`.
    #[arg(long, value_parser, default_value=None, conflicts_with="out_lib_path_literal")]
    out_lib_path_module: Option<Vec<String>>,

    /// If passed, adds verbose logging to the bindgen output, which is helpful for debugging
    /// issues in the bindgne itself.
    #[arg(long, action)]
    out_verbose_logs: bool,

    /// Config file override.
    #[arg(short, long)]
    config_override: Option<Utf8PathBuf>,
}

pub fn run(args: GenerateSubcommandArgs) -> Result<()> {
    let config_supplier = {
        use uniffi_bindgen::cargo_metadata::CrateConfigSupplier;
        let cmd = ::cargo_metadata::MetadataCommand::new();
        let metadata = cmd.exec().context("error running cargo metadata")?;
        CrateConfigSupplier::from(metadata)
    };
    let node_binding_generator = bindings::NodeBindingGenerator::new(
        args.out_dirname_api.into(),
        args.out_lib_disable_auto_load,
        args.out_import_extension.into(),
        args.out_node_version.as_str(),
        args.out_verbose_logs,
        utils::LibPath::from_raw(args.out_lib_path_literal, args.out_lib_path_module),
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
