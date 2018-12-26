import { terser } from "rollup-plugin-terser";

const minify = terser({
  compress: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
});

export default [
  {
    input: "./src/browser.js",
    output: {
      file: "./build/browser.js",
      format: "iife",
      name: "Birk",
      freeze: false,
    },
    plugins: [minify],
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
    plugins: [minify],
    external: ["fs", "path", "module"],
  },
];
