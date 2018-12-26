// @ts-check

const { tokenize } = require("./tokenize");
const { generateCode } = require("./codegen");
const { preProcess } = require("./preprocess");
const { BirkError } = require("./utils");
const runtime = require("./runtime");
const Module = require("module");
const { readFile: _readFile } = require("fs");
const readFile = require("util").promisify(_readFile);

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
 * @param {Options} options
 */
async function compileStringAsync(str, options) {
  const processed = await preProcess(str, options);
  options._fileMap = processed.fileMap;
  const out = compileString(processed.text, options);
  const flatten = iter => new Set([].concat(...[...iter]));
  const dependencies = flatten(processed.dependencyTree.values());
  Object.assign(out, {
    fileMap: processed.fileMap,
    dependencies,
    dependencyTree: processed.dependencyTree,
  });
  return out;
}

/**
 * @param {Options} options
 */
async function compileFile(options) {
  const content = await readFile(options.fileName, "utf8");
  return await compileStringAsync(content, options);
}

/**
 * @param {string} str template string (pre-processed)
 * @param {*} locals
 * @param {Options} options
 */
function renderString(str, locals, options) {
  const { fn } = compileString(str, options);
  return fn(locals, runtime);
}

/**
 * @param {string} str template string (pre-processed)
 * @param {*} locals
 * @param {Options} options
 */
async function renderStringAsync(str, locals, options) {
  const { fn } = await compileStringAsync(str, options);
  return fn(locals, runtime);
}

/**
 * @param {*} locals
 * @param {Options} options
 */
async function renderFile(locals, options) {
  const content = await readFile(options.fileName, "utf8");
  return await renderStringAsync(content, locals, options);
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
    let ctx = createEvalErrorContext(e);
    throw new BirkError(e.toString(), "CompileEval", ctx);
  }
}

/**
 * @param {string} code
 * @param {boolean} inlineRuntime
 * @returns {Executable}
 * @throws {BirkCompileEvalError}
 */
function generatorNode(code, inlineRuntime) {
  const m = new Module("");
  const argString = "_locals_" + (inlineRuntime ? "" : ", _r_");
  code = `module.exports = (${argString}) => {\n${code}\n};`;
  try {
    m._compile(code, "");
    return /** @type {Executable} */ m.exports;
  } catch (e) {
    let ctx = createEvalErrorContext(e);
    throw new BirkError(e.toString(), "CompileEval", ctx);
  }
}

function createEvalErrorContext(error) {
  if (error instanceof SyntaxError) {
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

module.exports = {
  compileFile,
  compileString,
  compileStringAsync,
  defaultOptions,
  generatorCommon,
  generatorNode,
  renderFile,
  renderString,
  renderStringAsync,
};
