# uniffi-bindgen-node

`uniffi-bindgen-node` is an experimental [uniffi](https://mozilla.github.io/uniffi-rs/latest/)
bindgen for node.js. It's heavily inspired by much of the excellent work on
[uniffi-bindgen-react-native](https://github.com/jhugman/uniffi-bindgen-react-native) and
[uniffi-bindgen-cpp](https://github.com/nordSecurity/uniffi-bindgen-cpp). It generates typescript
bindings and behind the scenes uses [ffi-rs](https://www.npmjs.com/package/ffi-rs) to load the input
dynamic library file and call the relevant operations.

> [!WARNING]
> uniffi-bindgen-node is a work in progress, and doesn't yet support the whole uniffi ffi specification.
> 
> Implemented features:
> - Records
> - Regular function calling
> - Async function calling
> - Enums (both bare enums and enums with associated fields)
> - Objects (multiple constructors, async + regular method calling)
> 
> Currently missing features:
> - Traits (including node -> rust function calls support)
> - Error enums / exceptions
> - Any sort of comprehensive test suite

## Differences from `uniffi-bindgen-react-native`
On the surface, these projects may seem to have similar aims, but there are some important
differences. `uniffi-bindgen-react-native` only supports mobile targets and web targets, and doesn't
have explicit node support. In addition, in order to compile the web target, the uniffi rust
bindings need to be compiled for `wasm32-unknown-unknown`, which depending on what the rust end of
the bindings are doing, may prove to be difficult given the lack of standard library availability.
Also, the `uniffi-bindgen-react-native` project uses a multi phase build process which fits
well into a react native workflow, but is fairly involved. `uniffi-bindgen-node` aims for a model
much closer to the [`python`
bindings](https://github.com/mozilla/uniffi-rs/tree/5fece7634717279765b4d0d38871b46e85067613/uniffi_bindgen/src/bindings/python),
where the build code bridges the dynamic library to node.js directly.

## Installation
1. Clone down this repository
2. Run `cargo install --path .`
3. `uniffi-bindgen-node` should be in `~/.cargo/bin` - make sure this is part of your `PATH`.

## Usage
Run `uniffi-bindgen-node -- <lib_path>`, passing a dynamic library (`dylib`/`dll`/`so`) build to
export a uniffi interface. See `output/` for the results. For more complicated scenarios, run
`uniffi-bindgen-node --help`.

## Development
Historically, local development has consisted of compiling ad hoc dynamic libraries, pointing the
bindgen at these, and then writing ad hoc scripts to exercise the resulting api interface.

For the time being, there is no comprehensive test suite. Some of these ad hoc scripts probably
could end up being turned into tests.

On mac / linux, a `test_bindgen.sh` script exists to automate this process. This script will build
the bindgen, copy the relevant dynamic library into the proper location, and run your test script
against the bindgen. Example script usage: `./test_bindgen.sh path/to/libexample.dylib path/to/test-script.ts`
