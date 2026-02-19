import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  target: "node18",
  dts: true,
  clean: true,

  // Inline ubrn into the built bundle since it doesn't publish a commonjs compatible build
  noExternal: ["uniffi-bindgen-react-native"],

  // Ensure that rtc-node isn't bundled so it can rely on the peer dependency version of the
  // project it is installed within
  external: ["@livekit/rtc-node"],

  // ref: https://stackoverflow.com/a/75868407
  shims: true,
});
