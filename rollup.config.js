import { terser } from "rollup-plugin-terser";

const minify = terser({
  compress: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
    toplevel: true,
  },
});

const commonPlugins = [];
if (process.env.BUILD !== "development") {
  commonPlugins.push(minify);
}

export default [
  {
    input: "./src/lite.js",
    output: {
      file: "./build/lite.js",
      format: "umd",
      name: "Birk",
      freeze: false,
    },
    plugins: [].concat(commonPlugins),
  },
  {
    input: "./src/index.js",
    output: {
      file: "./build/index.js",
      format: "cjs",
      freeze: false,
      strict: false,
      interop: false,
    },
    plugins: [].concat(commonPlugins),
    external: ["fs", "path", "module"],
  },
  {
    input: "./src/runtime.js",
    output: {
      file: "./build/runtime.js",
      format: "umd",
      name: "birkRuntime",
      freeze: false,
      strict: false,
      interop: false,
    },
    plugins: [].concat(commonPlugins),
  }
];
