// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum DirnameApi {
    Dirname,
    ImportMetaUrl,
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum ImportExtension {
    None,
    Ts,
    Js,
}

