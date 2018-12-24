// @ts-check
const { splitString } = require("./utils");

class Stack {
  constructor() {
    this.items = [0];
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
 * @typedef {{type: "raw", val: string, start: number, end: number, _pos_: number}} RawToken
 * @typedef {{type: "tag", val: string, start: number, end: number, _pos_: number, name: string, args: string[]}} TagToken
 * @typedef {{type: "object", val: string, start: number, end: number,  _pos_: number, name: string, filters: Array<{name: string, args: string[]}>}} ObjectToken
 * @typedef {RawToken | TagToken | ObjectToken} Token
 * @param {string} input
 */
function tokenize(input) {
  /** @type {Token[]} */
  const tokens = [];
  const lookUpMap = new Map([["object", "{{"], ["tag", "{%"], ["_inc_", "{#"]]);
  const posStack = new Stack;
  let iter = 0;
  let count = 10;

  while (lookUpMap.size !== 0) {
    const { type, beg } = lookout();
    if (iter !== beg) {
      tokens.push({
        type: "raw",
        val: input.slice(iter, beg),
        start: iter,
        end: beg,
        _pos_: posStack.v,
      });
    }
    if (type === "object") {
      iter = asObject(beg);
      // posStack.v = iter - posStack.v;
    } else if (type === "tag") {
      iter = asTag(beg);
      // posStack.v = iter - posStack.v;
    } else if (type === "_inc_") {
      iter = asInclude(beg);
    }
    if (!count--) break;
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
    const end = input.indexOf("}}", from);
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
      name: name.trim(),
      filters,
      val: input.slice(from, end + 2),
      start: from,
      end: end + 2,
      _pos_: posStack.v,
    });
    return end + 2;
  }

  /** @param {number} from search start position */
  function asTag(from) {
    const end = input.indexOf("%}", from);
    const match = input.slice(from + 2, end).trim();
    const [name, ...args] = splitString(match, " ");
    tokens.push({
      type: "tag",
      name: name.trim(),
      args,
      val: input.slice(from, end + 2),
      start: from,
      end: end + 2,
      _pos_: posStack.v,
    });
    return end + 2;
  }

  /** @param {number} from search start position */
  function asInclude(from) {
    const end = input.indexOf("#}", from);
    const val = input.slice(from + 2, end);
    const [type, length, file] = splitString(val.trim(), " ", 3);
    if (type === "beg") {
      posStack.push(Number(length));
    } else {
      from = end - from + 2 - posStack.v;
      posStack.pop();
    }
    tokens.push({
      type: "tag",
      name: "_file_",
      args: [type, file],
      val,
      start: from,
      end: end + 2,
      _pos_: from,
    });
    console.log(posStack);

    return end + 2;
  }
}


// function throwParseError(str, message, pos) {
//   const contextLength = [3, 3];
//   let posStart = pos;
//   let activeLine;
//   while (contextLength[0] > 0) {
//     const j = str.lastIndexOf("\n", posStart);
//     if (j === -1) break;
//     if (!activeLine) activeLine = j;
//     posStart = j - 1;
//     --contextLength[0];
//   }

//   let posEnd = pos;
//   while (contextLength[1] > 0) {
//     const j = str.indexOf("\n", posEnd);
//     if (j === -1) break;
//     if (!activeLine) activeLine = j;
//     posEnd = j + 1;
//     --contextLength[1];
//   }

//   const context =
//     str.slice(posStart, activeLine + 1) +
//     ">>> " +
//     str.slice(activeLine + 1, posEnd + 1);

//   console.log({ posStart, posEnd, contextLength, activeLine });
//   throw new Error(`${message}\n${context}`);
// }

module.exports = { tokenize };
