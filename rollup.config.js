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
    input: "./src/browser.js",
    output: {
      file: "./build/browser.js",
      format: "iife",
      name: "Birk",
      freeze: false,
    },
    plugins: [].concat(commonPlugins),
  },
  {
    input: "./src/node.js",
    output: {
      file: "./build/node.js",
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
      format: "cjs",
      freeze: false,
      strict: false,
      interop: false,
    },
    plugins: [].concat(commonPlugins),
  }
];
