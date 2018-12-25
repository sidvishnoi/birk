// @ts-check

const {
  BirkError,
  Buffer,
  errorContext2,
  getIdentifierBase,
  VariableContext,
} = require("./utils");
const tags = require("./tags");
const runtime = require("./runtime");

/**
 * @typedef {import("./tokenize").Token} Token
 * @typedef {{
 *  idx: number,
 *  fpos: number,
 *  file: string,
 *  buf: Buffer,
 *  locals: Set<string>,
 *  localsFullNames: Set<string>,
 *  filters: Map<string, [number, string]>,
 *  context: VariableContext,
 *  fileMap: Map<string, string>,
 *  warnings: Array<{ message: string, context: string }>,
 *  mixins: Map<string, { params: string[], tokens: Token[] }>,
 *  blocks: Map<string, { tokens: Token[], idx: number, file: string  }>,
 *  tokens: Token[],
 * }} State
 */

/**
 * @param {Token[]} tokens
 */
function main(tokens, fileMap, options) {
  /** @type {State} */
  const state = {
    idx: 0,
    buf: new Buffer(true),
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
  };

  const { buf } = state;

  // keep space for runtime, error context content and declarations
  const runtimeLoc = buf.buf.length;
  buf.addPlain("");
  const declarationsLoc = buf.buf.length;
  buf.addPlain("");

  // write actual code
  buf.addPlain("let _buf_ = '', _pos_, _file_ = 'main';");
  buf.addPlain("try {");
  generateCode(tokens, state);
  handleMixins(state);
  handleBlocks(state);
  buf.addPlain("return _buf_;");
  // buf.addPlain("console.log(_buf_);");
  buf.addPlain("} catch (e) {");
  buf.addPlain("const ctx = _r_.context(_pos_, _file_, _r_.fileMap);");
  buf.addPlain("_r_.rethrow(e, ctx, _r_.BirkError);");
  buf.addPlain("}");

  if (options.inlineRuntime) {
    buf.buf[runtimeLoc] = inlineRuntime(state, runtime);
  }

  const fileMapSerialization = JSON.stringify([...fileMap.entries()]);
  buf.buf[runtimeLoc] += `\n_r_.fileMap = new Map(${fileMapSerialization});`;

  if (state.filters.size) {
    const names = [...state.filters.keys()].filter(f => !/\W/.test(f));
    buf.buf[declarationsLoc] = `const { ${names.join(", ")} } = _r_.filters;`;
  }

  return {
    code: state.buf.toString(),
    locals: state.locals,
    localsFullNames: state.localsFullNames,
    context: state.context,
    warnings: state.warnings,
    blocks: state.blocks,
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
 * @typedef {import("./tokenize.js").ObjectToken} ObjectToken
 */
function handleObject(state) {
  const token = /** @type {ObjectToken} */ (state.tokens[state.idx]);
  state.buf.addDebug(state);
  const { name, filters } = token;

  const base = getIdentifierBase(name);
  if (!state.context.has(base)) {
    state.localsFullNames.add(name);
    state.locals.add(base);
  }

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
  state.idx += 1;
  state.buf.add(prefix + name + suffix);
}

/**
 * @param {State} state
 * @typedef {import("./tokenize.js").TagToken} TagToken
 */
function handleTag(state) {
  const idx = state.idx;
  const token = /** @type {TagToken} */ (state.tokens[state.idx]);
  const { name } = token;
  state.buf.addDebug(state);

  if (name.startsWith("+")) {
    // is a mixin call
    const mixinName = `_mixin_${name.substr(1)}`;
    const mixinArgs = token.args.join(", ");
    state.buf.addPlain(`${mixinName}(${mixinArgs})`);
    state.idx += 1;
    return;
  }

  if (name in tags && typeof tags[name] === "function") {
    tags[name](state, token);
  } else {
    const ctx = errorContext2(state);
    throw new BirkError(`Invalid tag: "${name}"`, "BirkCompileError", ctx);
  }
  if (state.idx === idx) {
    throw new BirkError(`Tag ${name} didn't change state`);
  }
}

/** @param {State} state */
function handleMixins(state) {
  // const { idx, tokens } = state;
  for (const [mixinName, { tokens, params }] of state.mixins.entries()) {
    state.idx = 0;
    state.tokens = tokens;
    state.buf.addPlain(`function _mixin_${mixinName}(${params.join(", ")}) {`);
    generateCode(tokens, state);
    state.buf.addPlain("}");
  }
  // state.idx = idx;
  // state.tokens = tokens;
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

function inlineRuntime(state, runtime) {
  const { filters, context, rethrow } = runtime;
  const r = [];
  r.push("const _r_ = {");

  if (state.filters.size) {
    r.push("filters: {");
    for (const [filter, [fpos, file]] of state.filters.entries()) {
      const isValid = filters.hasOwnProperty(filter);
      if (isValid) {
        r.push(`${filter}: ${fmt(filters[filter].toString())},`);
        continue;
      }
      state.warnings.push({
        message: `Filter "${filter}" was not provided during compile.`,
        context: context(fpos, file, state.fileMap),
      });
    }
    r.push("},");
  }

  r.push(`context: ${fmt(context.toString())},`);
  r.push(`BirkError: ${fmt(BirkError.toString())},`);
  r.push(`rethrow: ${fmt(rethrow.toString())},`);
  r.push("};");
  return r.join("\n");
}

// strip whitespace for writing
// TODO: make this simpler and faster
function fmt(x) {
  return x
    .replace(/\s{2,}/g, "")
    .replace(/\s(=|\+|-|\?|>|<|:)\s/g, "$1")
    .replace(/(,|=|>)\s/g, "$1")
    .replace(/\s(\{|\(|=|\+|-)/g, "$1")
    .replace(/;\s*\}/g, "}");
}

module.exports = { generateCode: main };
