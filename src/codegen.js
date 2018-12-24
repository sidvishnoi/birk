// @ts-check
const utils = require("./utils");
const tags = require("./tags");

/**
 * @typedef {import("./tokenize").Token} Token
 * @typedef {{
 *  idx: number,
 *  buf: Buffer,
 *  locals: Set<string>,
 *  localsFullNames: Set<string>,
 *  filters: Set<string>,
 *  assign: Set<string>,
 *  mixins: Map<string, { params: string[], tokens: Token[] }>,
 *  tokens: Token[],
 * }} State
 */

class Buffer {
  constructor(debug = true) {
    /** @type {string[]} */
    this.buf = [];
    this.debug = debug;
  }

  /** @param {string} str */
  add(str, quoted = false) {
    this.buf.push(
      `_buf_ += ${quoted ? `${JSON.stringify(str)}` : str};`
      // `_buf_ += ${quoted ? `\`${str}\`` : str};`
    );
  }

  /** @param {Token} token */
  addDebug(token) {
    if (!this.debug) return;
    let debugStr = `_pos_ = ${token.fpos};`;
    if (this.buf[this.buf.length - 1].startsWith("_pos_")) {
      this.buf[this.buf.length - 1] = debugStr;
    } else {
      this.buf.push(debugStr);
    }
  }

  /** @param {string} str */
  addPlain(str) {
    this.buf.push(str);
  }

  toString() {
    return this.buf.join("\n");
  }
}

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
    filters: new Set(),
    assign: new Set(),
    mixins: new Map(),
    tokens,
  };

  state.buf.addPlain(`let _buf_ = "", _pos_, _file_;`);
  state.buf.addPlain(`try {`);
  generateCode(tokens, state);
  handleMixins(state);
  // state.buf.addPlain("return _buf_;");
  state.buf.addPlain(`} catch (err) {`);
  state.buf.addPlain(`console.error({ _pos_, _file_ }); throw err;`);
  state.buf.addPlain(`}`);
  state.buf.addPlain("console.log(_buf_);");

  return { code: state.buf.toString() };
}

/**
 *
 * @param {Token[]} tokens
 * @param {State} state
 */
function generateCode(tokens, state) {
  const { length } = tokens;
  while (state.idx < length) {
    const token = tokens[state.idx];
    switch (token.type) {
      case "raw":
        const value = token.val;
        if (value) {
          state.buf.addDebug(token);
          state.buf.add(value, true);
        }
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
  state.buf.addDebug(token);
  const { name, filters } = token;

  const base = utils.getIdentifierBase(name);
  if (!state.assign.has(base)) {
    state.localsFullNames.add(name);
    state.locals.add(base);
  }

  let prefix = "";
  let suffix = "";
  for (let i = 0, length = filters.length; i < length; ++i) {
    const filterName = filters[length - 1 - i].name;
    state.filters.add(filterName);
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
  state.buf.addDebug(token);

  if (name.startsWith("+")) {
    // is a mixin call
    const mixinName = `_mixin_${name.substr(1)}`;
    const mixinArgs = token.args.join(", ");
    state.buf.addPlain(`${mixinName}(${mixinArgs})`);
    state.idx += 1;
    return;
  }

  if (name in tags && typeof tags[name] === "function") {
    tags[name](token, state);
  } else {
    throw new utils.CompileError(`Invalid tag: ${name}`, state);
  }
  if (state.idx === idx) {
    throw new utils.CompileError(
      `Tag ${name} didn't commit to next token`,
      state
    );
  }
}

/**
 * @param {State} state
 */
function handleMixins(state) {
  const { idx, tokens } = state;
  [...state.mixins.keys()].forEach(mixinName => {
    const { tokens, params } = state.mixins.get(mixinName);
    state.idx = 0;
    state.tokens = tokens;
    state.buf.addPlain(`function _mixin_${mixinName}(${params.join(", ")}) {`);
    generateCode(tokens, state);
    state.buf.addPlain("}");
  });
  state.idx = idx;
  state.tokens = tokens;
}

module.exports = { generateCode: main };
