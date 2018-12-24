// @ts-check
const { splitString, getContext, BirkError } = require("./utils");

class Stack {
  constructor() {
    this.items = [];
  }

  push(val) {
    this.items.push(val);
    return val;
  }

  set v(val) {
    this.items[this.items.length - 1] = val;
  }

  get v() {
    return this.items[this.items.length - 1];
  }

  pop() {
    return this.items.pop();
  }
}

/**
 * @typedef {{type: "raw", val: string, start: number, end: number, fpos: number}} RawToken
 * @typedef {{type: "tag", val: string, start: number, end: number, fpos: number, name: string, args: string[]}} TagToken
 * @typedef {{type: "object", val: string, start: number, end: number,  fpos: number, name: string, filters: Array<{name: string, args: string[]}>}} ObjectToken
 * @typedef {RawToken | TagToken | ObjectToken} Token
 * @param {string} input
 */
function tokenize(input, fileMap) {
  /** @type {Token[]} */
  const tokens = [];
  const lookUpMap = new Map([["object", "{{"], ["tag", "{%"], ["_inc_", "{#"]]);
  const posStack = new Stack();
  let iter = 0;
  let activeFile = new Stack();

  // seems a fine limit to avoid infinite loop
  let MAX_TOKEN_COUNT = 4000;

  while (lookUpMap.size !== 0) {
    const { type, beg } = lookout();
    if (iter !== beg) {
      tokens.push({
        type: "raw",
        fpos: posStack.v,
        val: input.slice(iter, beg),
        start: iter,
        end: beg,
      });
      posStack.v += beg - iter;
    }
    if (type === "object") {
      iter = asObject(beg);
      posStack.v += iter - beg;
    } else if (type === "tag") {
      iter = asTag(beg);
      posStack.v += iter - beg;
    } else if (type === "_inc_") {
      iter = asInclude(beg);
    }
    if (!MAX_TOKEN_COUNT--) {
      throw new Error("MAX_TOKEN_COUNT limit exceeded during tokenization.");
    }
  }

  return tokens;

  function lookout() {
    let beg = input.length;
    let type = "";
    for (const [key, val] of lookUpMap) {
      const idx = input.indexOf(val, iter);
      if (idx === -1) {
        lookUpMap.delete(key);
      } else if (idx < beg) {
        beg = idx;
        type = key;
      }
    }
    return { type, beg };
  }

  /** @param {number} from search start position */
  function asObject(from) {
    const end = search("}}", from);
    const match = input.slice(from + 2, end).trim();
    const [name, ..._filters] = splitString(match, "|");

    /** @type {Array<{name: string, args: string[]}>}  */
    const filters = [];
    for (const filter of _filters) {
      const [filterName, _args] = splitString(filter, ":");
      const args = _args ? splitString(_args, ",").map(arg => arg.trim()) : [];
      filters.push({ name: filterName.trim(), args });
    }
    tokens.push({
      type: "object",
      fpos: posStack.v,
      name: name.trim(),
      filters,
      val: input.slice(from, end + 2),
      start: from,
      end: end + 2,
    });
    return end + 2;
  }

  /** @param {number} from search start position */
  function asTag(from) {
    const end = search("%}", from, "ending tag token");
    const match = input.slice(from + 2, end).trim();
    const [name, ...args] = splitString(match, " ");
    tokens.push({
      type: "tag",
      fpos: posStack.v,
      name: name.trim(),
      args,
      val: input.slice(from, end + 2),
      start: from,
      end: end + 2,
    });
    return end + 2;
  }

  /** @param {number} from search start position */
  function asInclude(from) {
    const end = search("#}", from);
    const val = input.slice(from + 2, end);
    const [type, length, file] = splitString(val.trim(), " ", 3);

    let fpos;
    if (type === "beg") {
      posStack.v += Number(length);
      posStack.push(0);
      activeFile.push(file);
      fpos = from;
    } else {
      fpos = posStack.pop();
      activeFile.pop();
    }

    tokens.push({
      type: "tag",
      fpos,
      name: "_file_",
      args: [type, file],
      val: input.slice(from, end + 2),
      start: from,
      end: end + 2,
    });
    return end + 2;
  }

  /**
   * @param {string} needle string searching  for
   * @param {number} start start searching from index
   */
  function search(needle, start, needleName = "") {
    const i = input.indexOf(needle, start + 2);
    if (i === -1) {
      const context = getContext(posStack.v, activeFile.v, fileMap, true);
      throw new BirkError(
        `Malformed token. Failed to find ${needleName + ` "${needle}"`}.`,
        "BirkParserError",
        context
      );
    }

    for (const bad of ["{{", "{%"]) {
      const j = input.indexOf(bad, start + 2);
      if (j === -1) continue;
      if (j < i) {
        const context = getContext(posStack.v + 2, activeFile.v, fileMap);
        throw new BirkError(
          `Malformed token. Failed to find ${needleName +
            ` "${needle}"`}. Found "${bad}" instead.`,
          "BirkParserError",
          context
        );
      }
    }
    return i;
  }
}

module.exports = { tokenize };
