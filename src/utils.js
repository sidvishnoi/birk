/**
 * Convert `foo.bar` or `foo[bar]` etc. to `foo`
 * @param {string} str
 */
module.exports.getIdentifierBase = str => {
  for (let i = 0, length = str.length; i < length; ++i) {
    if (str[i] === "." || str[i] === "[") {
      return str.slice(0, i);
    }
  }
  return str;
};

module.exports.CompileError = class extends Error {
  constructor(message, state) {
    super(message);
    this.name = "CompileError";
    this.state = state;
  }
};

/**
 * @param {string} lookingFor
 * @param {import("./codegen.js").State} state
 * @returns {number} index of `lookingFor` in `state.tokens`
 */
module.exports.findTag = function findTag(lookingFor, { idx, tokens }) {
  /** @type string[] */
  const stack = [];
  const blockTags = new Set(["if", "for", "unless", "js", "comment", "raw"]);
  while (++idx < tokens.length) {
    if (tokens[idx].type === "tag") {
      /** @type {import("./codegen.js").TagToken} */
      const { name } = tokens[idx];
      if (name === lookingFor) {
        if (!stack.length) return idx; // found tag!
        else throw new Error(`invalid nesting at token #${idx}`);
      } else if (name.startsWith("end")) {
        if (stack[stack.length - 1] === name) stack.pop();
        else throw new Error(`invalid nesting at token #${idx}`);
      } else if (blockTags.has(name)) {
        stack.push("end" + name);
      }
    }
  }
  throw new Error(`matching tag not found: "${lookingFor}"`);
};


/**
 * split string at `ch` unless `ch` is inside quotes
 * @param {string} str
 * @param {string} ch
 * @param {number} limit
 */
module.exports.splitString = function splitString(str, ch, limit = 999) {
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
