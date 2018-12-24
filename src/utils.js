/**
 * Convert `foo.bar` or `foo[bar]` etc. to `foo`
 * @param {string} str
 */
function getIdentifierBase(str) {
  for (let i = 0, length = str.length; i < length; ++i) {
    if (str[i] === "." || str[i] === "[") {
      return str.slice(0, i);
    }
  }
  return str;
}

/**
 * @param {string} tag
 * @param {import("./codegen.js").State} state
 * @returns {number} index of `lookingFor` in `state.tokens`
 */
function findTag(tag, { idx, tokens }) {
  /** @type string[] */
  const stack = [];
  const blockTags = new Set(["if", "for", "unless", "js", "comment", "raw"]);
  while (++idx < tokens.length) {
    if (tokens[idx].type === "tag") {
      /** @type {import("./codegen.js").TagToken} */
      const { name } = tokens[idx];
      if (name === tag) {
        if (!stack.length) return idx;
        // found tag!
        else throw new Error(`invalid nesting at token #${idx}`);
      } else if (name.startsWith("end")) {
        if (stack[stack.length - 1] === name) stack.pop();
        else throw new Error(`invalid nesting at token #${idx}`);
      } else if (blockTags.has(name)) {
        stack.push("end" + name);
      }
    }
  }
  throw new Error(`matching tag not found: "${tag}"`);
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
    if (c === `"` || c === `'`) {
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

function getContext(pos, file, fileMap, nextLine = false, contextLength = 4) {
  const str = fileMap.get(file);
  const n = nextLine ? str.indexOf("\n", pos) : -1;

  function getPos(str, from, forward) {
    let remaining = contextLength;
    let p;
    while (remaining) {
      const j = forward ? str.indexOf("\n", from) : str.lastIndexOf("\n", from);
      p = j;
      if (j === -1) {
        p = forward ? str.length : 0;
        break;
      }
      from = forward ? j + 1 : j - 1;
      --remaining;
    }
    return p;
  }

  const pb = getPos(str, pos, false);
  const pf = getPos(str, pos, true);

  const bc = str.slice(pb, n !== -1 ? n : pos - 1).trimRight();
  const fc = str
    .slice(n !== -1 ? n + 1 : pos - 1, pf)
    .replace(/^\n/, "")
    .trimRight();

  const msg = `>>> Position ${pos} of "${file}" <<<`;
  const markerLen = bc.slice(bc.lastIndexOf("\n"), bc.length).length / 3;
  const markers = " ^^".repeat(Math.ceil(markerLen));
  return `${msg}\n\n${bc}\n${markers}\n${fc}`;
}


function asUnixPath(str) {
  if (/^\\\\\?\\/.test(str) || /[^\u0000-\u0080]+/.test(str)) {
    return str;
  }
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
    this.name = name || "BirkError";
    this.message += `\n${context}`;
    this.context = context;
  }
}

module.exports = {
  addIndent,
  asUnixPath,
  BirkError,
  findTag,
  getContext,
  getIdentifierBase,
  splitString,
  Stack,
};
