// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

use std::fs;
use camino::Utf8PathBuf;
use clap::Args;
use anyhow::{Result, Context};
use serde_json::json;

/// FOO
#[derive(Args, Debug)]
pub struct PublishingScaffoldNativePackageSubcommandArgs {
    /// Path to the compiled library (.so, .dylib, or .dll).
    lib_source: Utf8PathBuf,

    /// Rust triple representing the platform that `lib-source` was compiled under.
    lib_triple: Utf8PathBuf,

    /// The value of the "name" field in the main package's "package.json". Used to add context to
    /// the README.md about the purpose of the package.
    #[arg(long, default_value = None)]
    lib_package_name: Option<String>,

    /// The value to set the "name" field of the generated package.json
    #[arg(long)]
    package_name: String,

    /// The value to set the "version" field of the generated package.json
    #[arg(long, default_value = "0.0.0")]
    package_version: String,

    #[arg(long, default_value = None)]
    package_os: Option<String>,

    #[arg(long, default_value = None)]
    package_cpu: Option<String>,

    /// Output directory to write the native package into.
    #[arg(short, long, default_value = "./scaffolded-native-package")]
    out_dir: Utf8PathBuf,
}



pub fn run(args: PublishingScaffoldNativePackageSubcommandArgs) -> Result<()> {
    let lib_source_filename = args.lib_source.file_name().context("Cannot get filename from --lib-source")?;

    fs::create_dir_all(args.out_dir.clone()).context("Error creating native package root directory")?;
    fs::create_dir_all(args.out_dir.clone().join("src")).context("Error creating native package src directory")?;

    fs::copy(
        args.lib_source.clone(),
        args.out_dir.clone().join("src").join(lib_source_filename),
    ).context(format!("Error copying {lib_source_filename} into package"))?;

    let package_json = json!({
        "name": args.package_name,
        "version": args.package_version,
        "os": if let Some(os) = args.package_os { vec![os] } else { vec![] },
        "cpu": if let Some(cpu) = args.package_cpu { vec![cpu] } else { vec![] },

        "type": "module",
        "main": "./src/index.mjs",
        "types": "./src/index.d.mts",
        "exports": {
            ".": {
                "import": {
                    "types": "./src/index.d.mts",
                    "default": "./src/index.mjs"
                },
                "require": {
                    "types": "./src/index.d.cts",
                    "default": "./src/index.cjs"
                },
            }
        },
        "files": ["src", "README.md"],
        "engines": { "node": ">= 18" },
    });
    fs::write(
        args.out_dir.clone().join("package.json"),
        serde_json::to_string_pretty(&package_json)?,
    ).context("Error writing package.json")?;

    for (filename, contents) in [
        ("index.cjs", format!(
            r#"module.exports.default = () => ({{ triple: "{}", path: require("path").join(__dirname, "{}") }});"#,
            args.lib_triple,
            lib_source_filename,
        )),
        ("index.mjs", format!(
            r#"import {{ join, dirname }} from "path"; import {{ fileURLToPath }} from "url"; export default () => ({{ triple: "{}", path: join(dirname(fileURLToPath(import.meta.url)), "{}") }});"#,
            args.lib_triple,
            lib_source_filename,
        )),
        ("index.d.mts", format!(
            r#"declare function dlibFn(): {{ triple: "{}", path: string }}; export default dlibFn;"#,
            args.lib_triple,
        )),
        ("index.d.cts", format!(
            r#"declare function dlibFn(): {{ triple: "{}", path: string }}; export = dlibFn;"#,
            args.lib_triple,
        )),
    ] {
        fs::write(
            args.out_dir.clone().join("src").join(filename),
            contents,
        ).context(format!("Error writing {filename}"))?;
    }

    fs::write(
        args.out_dir.clone().join("README.md"),
        if let Some(lib_package_name) = args.lib_package_name {
            format!("# {}\nThis is an internal package containing the `{}` platform binary for the `{}` package.\n", args.package_name, args.lib_triple, lib_package_name)
        } else {
            format!("# {}\nThis is an internal package containing a `{}` platform binary.\n", args.package_name, args.lib_triple)
        },
    ).context(format!("Error writing README.md"))?;

    Ok(())
}
