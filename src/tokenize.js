// @ts-check
const { splitString, errorContext, BirkError, Stack } = require("./utils");

/**
 * @typedef {{type: "raw", val: string, start: number, end: number, fpos: number}} RawToken
 * @typedef {{type: "tag", val: string, start: number, end: number, fpos: number, name: string, args: string[]}} TagToken
 * @typedef {{type: "object", val: string, start: number, end: number,  fpos: number, name: string, filters: Array<{name: string, args: string[]}>}} ObjectToken
 * @typedef {RawToken | TagToken | ObjectToken} Token
 * @param {string} input
 */
module.exports.tokenize = function tokenize(input, fileMap) {
  /** @type {Token[]} */
  const tokens = [];
  const lookUpMap = new Map([["object", "{{"], ["tag", "{%"], ["_inc_", "{#"]]);
  const ptrStack = new Stack();
  const fileStack = new Stack();

  // seems a fine limit to avoid infinite loop
  let MAX_TOKEN_COUNT = 4000;

  let ptr = 0; // current position in input
  while (lookUpMap.size !== 0) {
    const { type, beg } = lookout();

    if (ptr !== beg) {
      tokens.push({
        type: "raw",
        fpos: ptrStack.v,
        val: input.slice(ptr, beg),
        start: ptr,
        end: beg,
      });
      ptrStack.v += beg - ptr;
    }

    if (type === "object") {
      ptr = eatObject(beg);
    } else if (type === "tag") {
      ptr = eatTag(beg);
    } else if (type === "_inc_") {
      ptr = eatInclude(beg);
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
      const idx = input.indexOf(val, ptr);
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
  function eatObject(from) {
    const end = search("}}", from, "ending object token");
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
      fpos: ptrStack.v,
      name: name.trim(),
      filters,
      val: input.slice(from, end + 2),
      start: from,
      end: end + 2,
    });
    ptrStack.v += end + 2 - from;
    return end + 2;
  }

  /** @param {number} from search start position */
  function eatTag(from) {
    const end = search("%}", from, "ending tag token");
    const match = input.slice(from + 2, end).trim();
    const [name, ...args] = splitString(match, " ");
    tokens.push({
      type: "tag",
      fpos: ptrStack.v,
      name: name.trim(),
      args,
      val: input.slice(from, end + 2),
      start: from,
      end: end + 2,
    });
    ptrStack.v += end + 2 - from;
    return end + 2;
  }

  /** @param {number} from search start position */
  function eatInclude(from) {
    const end = search("#}", from, "ending include token");
    const val = input.slice(from + 2, end);
    const [type, length, file] = splitString(val.trim(), " ", 3);

    let fpos;
    if (type === "beg") {
      fpos = from;
      ptrStack.v += Number(length);
      ptrStack.push(0);
      fileStack.push(file);
    } else {
      fpos = ptrStack.pop();
      fileStack.pop();
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
   * searches for closing tags (needle) from a given position
   * @throws {BirkError} needle not found or needle exists b/w malformed tags
   * @param {string} needle string searching  for
   * @param {number} start start searching from index
   * @param {string} needleName for providing details in error message
   */
  function search(needle, start, needleName = "") {
    const i = input.indexOf(needle, start + 2);
    if (i === -1) {
      const ctx = errorContext(ptrStack.v, fileStack.v, fileMap);
      throw new BirkError(
        `Malformed token. Failed to find ${needleName + ` "${needle}"`}.`,
        "BirkParserError",
        ctx
      );
    }

    for (const bad of ["{{", "{%"]) {
      const j = input.indexOf(bad, start + 2);
      if (j === -1) continue;
      if (j < i) {
        const ctx = errorContext(ptrStack.v + 2, fileStack.v, fileMap);
        throw new BirkError(
          `Malformed token. Failed to find ${needleName +
            ` "${needle}"`}. Found "${bad}" instead.`,
          "BirkParserError",
          ctx
        );
      }
    }
    return i;
  }
}
