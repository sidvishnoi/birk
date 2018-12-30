// @ts-check
import {
  addLocal,
  BirkError,
  Buffer,
  errorContext2,
  isValidIdentifier,
  VariableContext,
}  from "./utils";
import tags from "./tags";
import * as runtime from "./runtime";

/**
 * @typedef {import("birk").Token} Token
 * @typedef {import("birk").Options} Options
 * @typedef {import("birk").State} State
 */

/**
 * @param {Token[]} tokens
 * @param {Map<string, string>} fileMap
 * @param {Options} conf
 */
function main(tokens, fileMap, conf) {
  conf.tags = Object.assign({}, tags, conf.tags);
  conf._runtime = runtime;
  conf._runtime.filters = Object.assign({}, runtime.filters, conf.filters);

  /** @type {State} */
  const state = {
    idx: 0,
    buf: new Buffer(conf.compileDebug),
    locals: new Set(),
    localsFullNames: new Set(),
    filters: new Map(),
    mixins: new Map(),
    blocks: new Map(),
    context: new VariableContext(),
    fileMap,
    fpos: 0,
    file: "",
    warnings: [],
    tokens,
    conf,
  };

  const { buf } = state;

  // keep space for runtime, error context content and declarations
  const runtimeLoc = buf.buf.length;
  buf.addPlain("");
  const declarationsLoc = buf.buf.length;
  buf.addPlain("");

  // write actual code
  buf.addPlain("let _buf_ = '', _pos_, _file_ = '', _msg_;");
  buf.addPlain("try {");
  generateCode(tokens, state);
  handleMixins(state);
  handleBlocks(state);
  buf.addPlain("return _buf_;");
  // buf.addPlain("console.log(_buf_);");
  buf.addPlain("} catch (e) {");
  const filtersSerialization = JSON.stringify(
    [...state.filters.keys()].filter(f => !/\W/.test(f))
  );
  const fileMapSerialization = JSON.stringify([...fileMap.entries()]);
  buf.addPlain(`_r_._filters = new Set(${filtersSerialization});`);
  buf.addPlain(`_r_._fileMap = new Map(${fileMapSerialization});`);
  buf.addPlain("_r_.rethrow(_pos_, _file_, _r_, e, _msg_);");
  buf.addPlain("}");

  if (conf.inlineRuntime) {
    buf.buf[runtimeLoc] = inlineRuntime(state);
  }

  if (state.filters.size) {
    const names = [...state.filters.keys()].filter(f => !/\W/.test(f));
    buf.buf[declarationsLoc] += `const { ${names.join(", ")} } = _r_.filters;`;
  }

  if (state.locals.size) {
    const names = [...state.locals];
    buf.buf[declarationsLoc] += `\nconst { ${names.join(", ")} } = _locals_;`;
  }

  return {
    code: state.buf.toString(),
    locals: state.locals,
    localsFullNames: state.localsFullNames,
    warnings: state.warnings,
  };
}

/**
 * @param {Token[]} tokens
 * @param {State} state
 */
function generateCode(tokens, state) {
  const { length } = tokens;
  while (state.idx < length) {
    const token = tokens[state.idx];
    switch (token.type) {
    case "raw":
      state.buf.addDebug(state);
      state.buf.add(token.val, true);
      state.idx += 1;
      break;
    case "object":
      handleObject(state);
      break;
    case "tag":
      handleTag(state);
      break;
    }
  }
}

/**
 * @param {State} state
 * @typedef {import("birk").ObjectToken} ObjectToken
 */
function handleObject(state) {
  const token = /** @type {ObjectToken} */ (state.tokens[state.idx]);
  state.buf.addDebug(state);
  const { name, filters } = token;

  addLocal(name, state);

  let prefix = "";
  let suffix = "";
  for (let i = 0, length = filters.length; i < length; ++i) {
    const filterName = filters[length - 1 - i].name;
    state.filters.set(filterName, [token.fpos, state.file]);
    prefix += `${filterName}(`;
    if (filters[i].args.length > 0) {
      suffix += `, ${filters[i].args.join(", ")}`;
    }
    suffix += ")";
  }

  if (state.conf.compileDebug && isValidIdentifier(name)) {
    state.buf.addPlain(`_msg_ = _r_.undef(${name}, \`${name}\`);`);
  }
  state.buf.add(prefix + name + suffix);
  if (state.conf.compileDebug) {
    state.buf.addPlain("_msg_ = '';");
  }
  state.idx += 1;
}

/**
 * @param {State} state
 * @typedef {import("birk").TagToken} TagToken
 */
function handleTag(state) {
  const idx = state.idx;
  const token = /** @type {TagToken} */ (state.tokens[state.idx]);
  const { name } = token;
  state.buf.addDebug(state);

  if (name.startsWith("+")) {
    // is a mixin call
    const mixinName = `_mixin_${name.substr(1).replace(/:$/, "")}`;
    const mixinArgs = token.args;
    state.buf.addPlain(`${mixinName}(${mixinArgs})`);
    state.idx += 1;
    return;
  }

  const { tags } = state.conf;
  if (name in tags && typeof tags[name] === "function") {
    tags[name](state, token);
  } else {
    const ctx = errorContext2(state);
    const msg = `Tag "${name}" not found`;
    throw new BirkError(msg, "Compile", ctx);
  }
  if (state.idx === idx) {
    const ctx = errorContext2(state);
    const msg = `Tag "${name}" didn't change engine state`;
    throw new BirkError(msg, "Compile", ctx);
  }
}

/** @param {State} state */
function handleMixins(state) {
  for (const [mixinName, { tokens, params }] of state.mixins.entries()) {
    state.idx = 0;
    state.tokens = tokens;
    state.buf.addPlain(`function _mixin_${mixinName}(${params.join(", ")}) {`);
    generateCode(tokens, state);
    state.buf.addPlain("}");
  }
}

/** @param {State} state */
function handleBlocks(state) {
  for (const [name, block] of state.blocks.entries()) {
    const { tokens, file, idx } = block;
    state.idx = 0;
    state.tokens = tokens;
    const fn = `_block_${name}`;
    state.buf.buf[idx] = `${fn}();`;
    state.buf.addPlain(`function ${fn}() {`);
    state.buf.addPlain(`_file_ = "${file}";`);
    generateCode(tokens, state);
    state.buf.addPlain("}");
  }
}

function inlineRuntime(state) {
  const { context, rethrow, undef, uniter, filters } = state.conf._runtime;
  const r = [];
  r.push("const _r_ = {");

  if (state.filters.size) {
    r.push("filters: {");
    for (const [filter, [fpos, file]] of state.filters.entries()) {
      if (filters.hasOwnProperty(filter)) {
        const s = filters[filter].toString();
        if (s.startsWith("(") || s.includes("=>")) {
          r.push(`${filter}: ${s},`);
        } else {
          r.push(`${s},`);
        }
        continue;
      }
      state.warnings.push({
        message: `Filter "${filter}" was not provided during compile.`,
        context: context(fpos, file, state.fileMap),
      });
    }
    r.push("},");
  }

  r.push(`context: ${context.toString()},`);
  r.push(`BirkError: ${BirkError.toString()},`);
  r.push(`rethrow: ${rethrow.toString()},`);
  r.push(`undef: ${undef.toString()},`);
  r.push(`uniter: ${uniter.toString()},`);
  r.push("};");
  return r.join("\n");
}

export default main;
