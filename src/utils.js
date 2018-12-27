/**
 * Convert `foo(arg)`, `foo.bar(arg)`, `foo.bar(baz.foo(arg))` etc. => `arg`
 * then convert `foo.bar`, `foo[bar]` etc. to `foo`
 * @param {string} str
 */
function getIdentifierBase(str) {
  const re = /\b[^()]+\((.*)\)$/;
  while (re.test(str)) {
    str = str.match(re)[1];
  }
  for (let i = 0, length = str.length; i < length; ++i) {
    if (str[i] === "." || str[i] === "[") {
      return str.slice(0, i);
    }
  }
  return str;
}

/**
 * Test if id is a valid identifier i.e. starts with `[$_A-Za-z]`
 * This removes the possibilities such as: `{ id }`, `[ id ]`
 * Following are valid: `$user.name`, `_user['name']`, ` user `
 * @param {string} id identifier
 */
function isValidIdentifier(id) {
  return /^[$_A-Za-z]/.test(id.trim());
}

/**
 * Tests if id is a valid simple JS variable name.
 * @note It doesn't take into account JS keywords (for, if etc.)
 * @param {string} id identifier
 */
function isValidVariableName(id) {
  return (
    !/[\W]/.test(id) ||
    (id.startsWith("$") && isValidVariableName(id.replace(/^\$/)))
  );
}

function addLocal(name, state) {
  if (isValidIdentifier(name)) {
    const id = getIdentifierBase(name);
    if (!state.context.has(id)) {
      state.locals.add(id);
      state.localsFullNames.add(name);
    }
  }
}

const blockTags = new Set(["if", "for", "unless", "js", "comment", "raw"]);

/**
 * @param {string} tag
 * @param {import("./codegen.js").State} state
 * @param {boolean} ignoreNesting
 * @returns {number} index of `lookingFor` in `state.tokens`
 */
function findTag(tag, state, ignoreNesting = false) {
  const { tokens } = state;
  let { idx } = state;

  if (ignoreNesting) {
    while (++idx < tokens.length) {
      if (tokens[idx].type === "tag" && tokens[idx].name === tag) {
        return idx;
      }
    }
  }

  /** @type string[] */
  const stack = [];
  while (!ignoreNesting && ++idx < tokens.length) {
    if (tokens[idx].type !== "tag") continue;

    /** @type {import("./codegen.js").TagToken} */
    const { name } = tokens[idx];
    if (name === tag) {
      if (!stack.length) {
        return idx; // found tag!
      } else {
        const ctx = errorContext2(state, 4);
        throw new BirkError("Invalid nesting.", "Compile", ctx);
      }
    } else if (name.startsWith("end")) {
      if (stack[stack.length - 1] === name) {
        stack.pop();
      } else {
        const ctx = errorContext2(state, 4);
        throw new BirkError("Invalid nesting.", "Compile", ctx);
      }
    } else if (blockTags.has(name)) {
      stack.push("end" + name);
    }
  }

  let msg = `matching tag not found: "${tag}"`;
  const ctx = errorContext2(state);
  if (tag.startsWith("end")) {
    msg = `tag ${state.tokens[state.idx].val} not closed`;
  }
  throw new BirkError(msg, "Compile", ctx);
}

/**
 * split string at `ch` unless `ch` is inside quotes
 * @param {string} str
 * @param {string} ch
 * @param {number} limit
 */
function splitString(str, ch, limit = 999) {
  const { length } = str;
  const result = [];

  let start = 0;
  let i = 0;
  let quote = "";
  let marker = false;
  while (i < length) {
    const c = str.charAt(i);
    if (c === "\"" || c === "'") {
      if (quote === "") quote = c;
      if (c === quote) marker = !marker;
    } else if (c === ch && !marker) {
      const len = result.push(str.slice(start, i));
      start = i + 1;
      if (len > limit) return result;
    }
    ++i;
  }
  if (start <= length) {
    result.push(str.slice(start, i));
  }
  return result;
}

/**
 * create a error context based on `_pos_`, `_file_`, `fileMap`
 * @param {number} pos
 * @param {string} file
 * @param {Map<string, string>} fileMap
 * @param {number} ctx number of lines above and below the error line
 */
function errorContext(pos, file, fileMap, ctx = 2) {
  const lines = fileMap.get(file).split("\n");
  let p = 0;
  let lineNum = 0;
  for (const s of lines) {
    if (p + s.length + 1 > pos) break;
    p += s.length + 1;
    lineNum += 1;
  }
  return lines
    .map((s, i) => {
      const beg = i === lineNum ? `>>${" "}${i + 1}` : `${i + 1}`;
      return `${beg.padStart(5)}|${" "}${s}`;
    })
    .slice(
      Math.max(lineNum - ctx, 0),
      Math.min(lineNum + ctx + 1, lines.length)
    )
    .concat(` File| ${file}:${lineNum + 1}:${pos - p + 1 || ""}`)
    .join("\n");
}

function errorContext2({ fpos, file, fileMap }, ctx = 2) {
  return errorContext(fpos, file, fileMap, ctx);
}

function asUnixPath(str) {
  if (/^\\\\\?\\/.test(str)) return str;
  return str.replace(/\\/g, "/");
}

/**
 * Adds indentation to included file so the overall template has proper indendation
 * @param {number} indent
 * @param {string} str
 * @param {number} skipLine do not indent this line
 */
function addIndent(indent, str, skipLine = -1) {
  return str
    .split("\n")
    .map((s, i) => (i === skipLine ? s : " ".repeat(indent) + s))
    .join("\n");
}

class Stack extends Array {
  constructor() {
    super();
  }

  set v(val) {
    this[this.length - 1] = val;
  }

  get v() {
    return this[this.length - 1];
  }
}

class BirkError extends Error {
  constructor(message, name = "", context = "") {
    super(message);
    this.name = `Birk${name || ""}Error`;
    this.message += `\n${context}`;
  }
}

class VariableContext extends Array {
  constructor() {
    super();
    this.create();
  }

  create() {
    this.push(new Set());
  }

  destroy() {
    this.pop();
  }

  add(item) {
    this[this.length - 1].add(item);
  }

  has(item) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (this[i].has(item)) return true;
    }
    return false;
  }
}

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

  /** @param {State} state */
  addDebug(state) {
    state.fpos = state.tokens[state.idx].fpos;
    if (!this.debug) return;
    const debugStr = `_pos_ = ${state.fpos};`;
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

export {
  addIndent,
  addLocal,
  asUnixPath,
  BirkError,
  Buffer,
  errorContext,
  errorContext2,
  findTag,
  getIdentifierBase,
  isValidIdentifier,
  isValidVariableName,
  splitString,
  Stack,
  VariableContext,
};
