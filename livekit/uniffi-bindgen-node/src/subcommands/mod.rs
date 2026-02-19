// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

use clap::Subcommand;
use anyhow::Result;

pub mod generate;
pub mod publishing_scaffold_native_package;

#[derive(Subcommand, Debug)]
pub enum Subcommands {
    /// Generates node.js bindings for a given set of built uniffi bindings.
    /// This is probably the subcommand you want if you are just getting started.
    #[command(verbatim_doc_comment)]
    Generate(generate::GenerateSubcommandArgs),

    /// Generates a template for a npm package that encapsulates a built dll / dylib / dll.
    ///
    /// The module has a default export of a function, which when called returns an object with two keys:
    /// - "triple" mapping to the built rust triple the package represents
    /// - "path" containing an absolute path to the dll / dylib / so that is included in the package.
    /// Typescript definitions are also included. ie:
    ///
    /// > require('./example-native-package').default()
    /// {
    ///   path: '/path/to/example-native-package/src/libplugins_ai_coustics_uniffi.dylib',
    ///   triple: 'aarch64-apple-darwin'
    /// }
    ///
    /// Only intended for use when publishing package to npm for distribution.
    #[command(verbatim_doc_comment)]
    PublishingScaffoldNativePackage(publishing_scaffold_native_package::PublishingScaffoldNativePackageSubcommandArgs),
}

pub fn run(command: Subcommands) -> Result<()> {
    match command {
        Subcommands::Generate(args) => generate::run(args),
        Subcommands::PublishingScaffoldNativePackage(args) => publishing_scaffold_native_package::run(args),
    }
}
