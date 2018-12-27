// @ts-check

import tokenize from "./tokenize";
import generateCode from "./codegen";
import { BirkError } from "./utils";
import * as runtime from "./runtime";

/**
 * @typedef
 * {{
 *  fileName: string,
 *  baseDir: string,
 *  includesDir: string,
 *  compileDebug: boolean,
 *  inlineRuntime: boolean,
 *  raw: boolean,
 *  filters: { [name: string]: (args: any[]) => any },
 *  tags: import("./tags.js").Tags,
 *  _fileMap?: Map<string, string>,
 *  _runtime?: Runtime,
 *  _generator?: (code: string, inlineRuntime: boolean) => Executable
 * }} Options
 */

/** @type {Options} */
const defaultOptions = {
  fileName: "",
  baseDir: "",
  includesDir: "",
  compileDebug: true,
  inlineRuntime: false,
  raw: false,
  filters: {},
  tags: {},
  _generator: generatorCommon,
};

/**
 * @param {string} str template string (pre-processed)
 * @param {Options} options
 */
function compileString(str, options) {
  options = Object.assign({}, defaultOptions, options);
  const fileMap = options._fileMap || new Map().set("", str);
  const tokens = tokenize(str, fileMap);
  const out = generateCode(tokens, fileMap, options);
  const { code, locals, warnings } = out;
  let fn;
  if (!options.raw && options._generator) {
    fn = options._generator(code, options.inlineRuntime);
  }
  return { code, fn, locals, warnings };
}

/**
 * @param {string} str template string (pre-processed)
 * @param {*} locals
 * @param {Options} options
 */
function renderString(str, locals, options) {
  const { fn } = compileString(str, options);
  return fn(locals || {}, runtime);
}

/**
 * @param {string} code
 * @param {boolean} inlineRuntime
 * @typedef {import("./runtime.js")} Runtime
 * @typedef {(locals: *, runtime?: Runtime) => string} Executable
 * @returns {Executable}
 * @throws {BirkCompileEvalError}
 */
function generatorCommon(code, inlineRuntime) {
  const args = ["_locals_"];
  if (!inlineRuntime) args.push("_r_");
  try {
    return /** @type {Executable} */ (new Function(...args, code));
  } catch (e) {
    const ctx = createEvalErrorContext(e);
    throw new BirkError(e.toString(), "CompileEval", ctx);
  }
}

function createEvalErrorContext(error) {
  if (error.__proto__.name === "SyntaxError") {
    const end = error.stack.search("SyntaxError:");
    let ctx = "Following might give some hints:\n";
    ctx += error.stack
      .slice(0, end)
      .replace(/^:\d+/, "")
      .trim() || "😟";
    return ctx;
  }
  return "😟";
}

export {
  compileString,
  createEvalErrorContext,
  defaultOptions,
  generatorCommon,
  renderString,
};
