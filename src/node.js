import {
  compileString as _compileString,
  renderString as _renderString,
  createEvalErrorContext
} from "./lib-common";
import { BirkError } from "./utils";
import * as runtime from "./runtime";
import preProcess from "./preprocess";

import Module from "module";
import { readFile as _readFile } from "fs";

/**
 * @param {string} str template string (pre-processed)
 * @param {Options} options
 */
async function compileStringAsync(str, options) {
  options._generator = generatorNode;
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
  options._generator = generatorNode;
  const content = await readFile(options.fileName, "utf8");
  return await compileStringAsync(content, options);
}

/**
 * @param {string} str template string (pre-processed)
 * @param {*} locals
 * @param {Options} options
 */
async function renderStringAsync(str, locals, options) {
  options._generator = generatorNode;
  const { fn } = await compileStringAsync(str, options);
  return fn(locals, runtime);
}

/**
 * @param {*} locals
 * @param {Options} options
 */
async function renderFile(locals, options) {
  options._generator = generatorNode;
  const content = await readFile(options.fileName, "utf8");
  return await renderStringAsync(content, locals, options);
}

function compileString(str, options) {
  options._generator = generatorNode;
  return _compileString(str, options);
}

function renderString(str, locals, options) {
  options._generator = generatorNode;
  return _renderString(str, locals, options);
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

/** @param {string} file file path */
function readFile(file) {
  return new Promise((resolve, reject) => {
    _readFile(file, "utf8", (err, content) => {
      if (err) reject(err);
      resolve(content);
    });
  });
}

export {
  compileFile,
  compileString,
  compileStringAsync,
  renderFile,
  renderString,
  renderStringAsync,
};
