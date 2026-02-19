// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

use std::collections::{HashMap, HashSet};

use camino::Utf8PathBuf;
use serde::Deserialize;

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

#[derive(Debug, Clone)]
pub enum LibPath {
    Omitted,
    Literal(Utf8PathBuf),
    Modules(LibPathModules),
}

impl LibPath {
    pub fn from_raw(
        out_lib_path_literal: Option<Utf8PathBuf>,
        out_lib_path_module: Option<Vec<String>>,
    ) -> Self {
        if let Some(value) = out_lib_path_literal {
            return Self::Literal(value);

        } else if let Some(mods) = out_lib_path_module {
            Self::Modules(LibPathModules(mods.into_iter().map(|module| {
                serde_json::from_str(module.as_str()).unwrap_or(
                    SerializedLibPathModule::from(module)
                ).into()
            }).collect()))

        } else {
            Self::Omitted
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
struct SerializedLibPathModule {
    pub module: String,
    pub version: Option<String>,
    pub platform: Option<String>,
    pub arch: Option<String>,
}

impl From<String> for SerializedLibPathModule {
    fn from(module: String) -> Self {
        Self { module, version: None, platform: None, arch: None }
    }
}

impl From<SerializedLibPathModule> for LibPathModule {
    fn from(value: SerializedLibPathModule) -> Self {
        let mut module = LibPathModule::new(value.module.as_str());

        if let Some(version) = value.version {
            module = module.with_optional_dependency_version(version);
        };
        if let Some(platform) = value.platform {
            module = module.with_filter("process.platform", platform);
        };
        if let Some(arch) = value.arch {
            module = module.with_filter("process.arch", arch);
        };

        module
    }
}

/// A struct representing a node.js js module containing a native dll / dylib / so.
#[derive(Debug, Clone)]
pub struct LibPathModule {
    pub require_path: String,

    /// The `optionalDependencies` version of the given package. If unset, don't add the module to
    /// `optionalDependencies` in the generated package.json.
    pub optional_dependency_version: Option<String>,

    /// A set of abstract filters used to determine which systems this given module should be
    /// loaded on. Filters are arbitrary but examples could be os, cpu architecture, etc.
    pub filters: HashMap<&'static str, String>,
}

impl LibPathModule {
    pub fn new(require_path: &str) -> Self {
        Self {
            require_path: require_path.into(),
            filters: Default::default(),
            optional_dependency_version: None,
        }
    }
    pub fn with_filter(mut self, filter_key: &'static str, filter_value: String) -> Self {
        self.filters.insert(filter_key, filter_value);
        self
    }
    pub fn with_optional_dependency_version(mut self, optional_dependency_version: String) -> Self {
        self.optional_dependency_version = Some(optional_dependency_version);
        self
    }
}

#[derive(Debug, Clone)]
pub struct LibPathModules(Vec<LibPathModule>);

#[derive(Debug, Clone, PartialEq)]
pub enum LibPathSwitchToken<T> {
    Switch(&'static str),
    Case(String),
    EndCase,
    EndSwitch(&'static str),
    Value(T),
}

impl LibPathModules {
    pub fn as_switch_tokens_by(
        &self,
        dimensions: Vec<&'static str>,
    ) -> Vec<LibPathSwitchToken<String>> {
        if self.0.is_empty() {
            return vec![];
        };

        let Some((first_dimension, rest_dimensions)) = dimensions.split_first() else {
            return self
                .0
                .iter()
                .map(|module| LibPathSwitchToken::Value(module.require_path.clone()))
                .collect();
        };

        let mut grouped_modules = HashMap::new();
        for module_entry in self.0.iter() {
            let Some(dimension_value) = module_entry.filters.get(*first_dimension) else {
                continue;
            };

            grouped_modules
                .entry(dimension_value.clone())
                .or_insert(vec![])
                .push(module_entry);
        }

        let mut tokens = vec![];

        tokens.push(LibPathSwitchToken::Switch(*first_dimension));

        // NOTE: sort the cases in alhpabetical order so that the tests below can assert against
        // the token list detemrinistically.
        let mut sorted_grouped_modules = grouped_modules.into_iter().collect::<Vec<_>>();
        sorted_grouped_modules.sort_by(|(a_key, _), (b_key, _)| a_key.cmp(b_key));

        for (first_dimension_value, module_entries) in sorted_grouped_modules {
            tokens.push(LibPathSwitchToken::Case(first_dimension_value));

            let module_entries_cloned = module_entries
                .iter()
                .map(|entry| {
                    let mut cloned = (*entry).clone();
                    cloned.filters.remove(first_dimension);
                    cloned
                })
                .collect();

            let values = Self(module_entries_cloned).as_switch_tokens_by(rest_dimensions.to_vec());
            tokens.extend(values);
            tokens.push(LibPathSwitchToken::EndCase);
        }
        tokens.push(LibPathSwitchToken::EndSwitch(*first_dimension));

        // Finish the tokens list with any entries that don't have associated filters
        tokens.extend(
            self.0
                .iter()
                .filter(|module_entry| module_entry.filters.is_empty())
                .map(|module_entry| LibPathSwitchToken::Value(module_entry.require_path.clone())),
        );

        tokens
    }

    pub fn as_switch_tokens(&self) -> Vec<LibPathSwitchToken<String>> {
        let keys = self
            .0
            .iter()
            .flat_map(|module| module.filters.keys())
            .map(|key| *key)
            .collect::<HashSet<_>>();
        self.as_switch_tokens_by(keys.into_iter().collect())
    }

    pub fn optional_dependencies(&self) -> HashMap<String, String> {
        self.0
            .iter()
            .filter_map(|m| {
                m.optional_dependency_version
                    .clone()
                    .map(|d| (m.require_path.clone(), d))
            })
            .collect::<HashMap<_, _>>()
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_happy_path() {
        let result = LibPathModules(vec![
            LibPathModule::new("foo")
                .with_filter("arch", "x86".into())
                .with_filter("platform", "win".into()),
            LibPathModule::new("bar")
                .with_filter("arch", "x86".into())
                .with_filter("platform", "mac".into()),
            LibPathModule::new("baz")
                .with_filter("arch", "aarch64".into())
                .with_filter("platform", "win".into()),
        ])
        .as_switch_tokens_by(vec!["arch", "platform"]);

        assert_eq!(
            result,
            vec![
                LibPathSwitchToken::Switch("arch"),
                LibPathSwitchToken::Case("aarch64".into()),
                LibPathSwitchToken::Switch("platform"),
                LibPathSwitchToken::Case("win".into()),
                LibPathSwitchToken::Value("baz".into()),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::EndSwitch("platform"),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::Case("x86".into()),
                LibPathSwitchToken::Switch("platform"),
                LibPathSwitchToken::Case("mac".into()),
                LibPathSwitchToken::Value("bar".into()),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::Case("win".into()),
                LibPathSwitchToken::Value("foo".into()),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::EndSwitch("platform"),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::EndSwitch("arch"),
            ]
        );
    }

    #[test]
    fn test_filter_values_go_right_after_each_other() {
        let result = LibPathModules(vec![
            LibPathModule::new("foo")
                .with_filter("arch", "x86".into())
                .with_filter("platform", "win".into()),
            // NOTE: bar and baz have the same filters...
            LibPathModule::new("bar")
                .with_filter("arch", "x86".into())
                .with_filter("platform", "mac".into()),
            LibPathModule::new("baz")
                .with_filter("arch", "x86".into())
                .with_filter("platform", "mac".into()),
            LibPathModule::new("quux")
                .with_filter("arch", "aarch64".into())
                .with_filter("platform", "win".into()),
        ])
        .as_switch_tokens_by(vec!["arch", "platform"]);

        assert_eq!(
            result,
            vec![
                LibPathSwitchToken::Switch("arch"),
                LibPathSwitchToken::Case("aarch64".into()),
                LibPathSwitchToken::Switch("platform"),
                LibPathSwitchToken::Case("win".into()),
                LibPathSwitchToken::Value("quux".into()),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::EndSwitch("platform"),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::Case("x86".into()),
                LibPathSwitchToken::Switch("platform"),
                LibPathSwitchToken::Case("mac".into()),
                LibPathSwitchToken::Value("bar".into()), // ... so bar goes here
                LibPathSwitchToken::Value("baz".into()), // and baz goes right afterwards (sorted alphabetically)
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::Case("win".into()),
                LibPathSwitchToken::Value("foo".into()),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::EndSwitch("platform"),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::EndSwitch("arch"),
            ]
        );
    }

    #[test]
    fn test_cases_without_filters_go_last() {
        let result = LibPathModules(vec![
            LibPathModule::new("foo")
                .with_filter("arch", "x86".into())
                .with_filter("platform", "win".into()),
            LibPathModule::new("bar")
                .with_filter("arch", "x86".into())
                .with_filter("platform", "mac".into()),
            LibPathModule::new("baz"), // NOTE: baz has no filters...
        ])
        .as_switch_tokens_by(vec!["arch", "platform"]);

        assert_eq!(
            result,
            vec![
                LibPathSwitchToken::Switch("arch"),
                LibPathSwitchToken::Case("x86".into()),
                LibPathSwitchToken::Switch("platform"),
                LibPathSwitchToken::Case("mac".into()),
                LibPathSwitchToken::Value("bar".into()),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::Case("win".into()),
                LibPathSwitchToken::Value("foo".into()),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::EndSwitch("platform"),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::EndSwitch("arch"),
                LibPathSwitchToken::Value("baz".into()), // ... so baz goes last.
            ]
        );
    }

    #[test]
    fn test_no_filters() {
        let result = LibPathModules(vec![]).as_switch_tokens_by(vec!["arch", "platform"]);
        assert_eq!(result, vec![]);
    }

    #[test]
    fn test_not_every_entry_has_every_filter() {
        let result = LibPathModules(vec![
            LibPathModule::new("foo").with_filter("arch", "x86".into()),
            LibPathModule::new("bar")
                .with_filter("arch", "x86".into())
                .with_filter("platform", "mac".into()),
            LibPathModule::new("baz")
                .with_filter("arch", "aarch64".into())
                .with_filter("platform", "win".into()),
        ])
        .as_switch_tokens_by(vec!["arch", "platform"]);

        assert_eq!(
            result,
            vec![
                LibPathSwitchToken::Switch("arch"),
                LibPathSwitchToken::Case("aarch64".into()),
                LibPathSwitchToken::Switch("platform"),
                LibPathSwitchToken::Case("win".into()),
                LibPathSwitchToken::Value("baz".into()),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::EndSwitch("platform"),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::Case("x86".into()),
                LibPathSwitchToken::Switch("platform"),
                LibPathSwitchToken::Case("mac".into()),
                LibPathSwitchToken::Value("bar".into()),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::EndSwitch("platform"),
                LibPathSwitchToken::Value("foo".into()),
                LibPathSwitchToken::EndCase,
                LibPathSwitchToken::EndSwitch("arch"),
            ]
        );
    }
}
