// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

use anyhow::Result;
use clap::Parser;

mod bindings;
mod utils;
mod subcommands;

/// UniFFI binding generator for Node.js
#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
pub struct RootArgs {
    #[command(subcommand)]
    command: subcommands::Subcommands,
}

pub fn run(args: RootArgs) -> Result<()> {
    subcommands::run(args.command)
}
