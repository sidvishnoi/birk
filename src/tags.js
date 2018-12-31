// @ts-check

import {
  addLocal,
  BirkError,
  findTag,
  isValidVariableName,
  splitString,
  errorContext2,
  isValidIdentifier,
} from "./utils";

/**
 * @typedef {import("birk").State} State
 * @typedef {import("birk").TagToken} Token
 * @typedef {import("birk").Tag} Tag
 * @type {{ [name: string]: Tag }}
 */
const tags = {
  assign(state, { args }) {
    const matches = args.match(/^([\w.[\]"'_$]+)/);
    const name = matches ? matches[1] : "";
    if (!isValidIdentifier(name)) {
      const msg = "Assigning to invalid identifier.";
      throw new BirkError(msg, "Compile", errorContext2(state));
    }

    if (state.context.has(name)) {
      state.buf.addPlain(`${args};`);
    } else {
      state.context.add(name);
      state.buf.addPlain(`let ${args};`);
    }
    state.idx += 1;
  },

  using(state, { args }) {
    const names = splitString(args, ",");
    names.pop(); // remove last one as it's empty
    names.forEach(name => {
      if (!isValidVariableName(name)) {
        const msg =
          "`using` tag expects base level identifiers separated by comma.";
        throw new BirkError(msg, "Compile", errorContext2(state));
      }
      state.locals.add(name);
      state.localsFullNames.add(name);
      state.context[0].add(name); // add to global context
    });
    state.idx += 1;
  },

  capture(state, { args }) {
    const end = findTag("endcapture", state, true);

    let capturedValue = "";
    for (let i = state.idx + 1; i < end; ++i) {
      state.buf.addDebug(state);
      capturedValue += state.tokens[i].val;
    }

    const [name] = splitString(args, " ", 1);
    if (state.context.has(name)) {
      state.buf.addPlain(`${name} = \`${capturedValue}\`;`);
    } else {
      state.context.add(name);
      state.buf.addPlain(`let ${name} = \`${capturedValue}\`;`);
    }

    state.idx = end + 1;
  },

  raw(state) {
    const start = state.idx + 1;
    const end = findTag("endraw", state, true);
    for (let i = start; i < end; ++i) {
      state.idx = i;
      state.buf.addDebug(state);
      state.buf.add(state.tokens[i].val, true);
    }
    state.idx = end;
    state.buf.addDebug(state);
    state.idx = end + 1;
  },

  js(state) {
    const start = state.idx + 1;
    const end = findTag("endjs", state);
    for (let i = start; i < end; ++i) {
      state.buf.addDebug(state);
      state.buf.addPlain(state.tokens[i].val.trim());
    }
    state.idx = end;
    state.buf.addDebug(state);
    state.idx = end + 1;
  },

  comment(state) {
    const end = findTag("endcomment", state, true);
    state.idx = end + 1;
  },

  if(state, { args }) {
    findTag("endif", state);
    state.context.create();
    state.buf.addPlain(`if (${args}) {`);
    state.idx += 1;
  },

  elseif(state, { args }) {
    findTag("endif", state);
    state.context.destroy();
    state.context.create();
    state.buf.addPlain(`} else if (${args}) {`);
    state.idx += 1;
  },

  else(state) {
    findTag("endif", state);
    state.context.destroy();
    state.context.create();
    state.buf.addPlain("} else {");
    state.idx += 1;
  },

  endif: blockEnd,

  case(state, { args }) {
    findTag("endcase", state);
    state.context.create();
    const [arg] = splitString(args, " ", 1);
    state.buf.addPlain(`switch (${arg}) {`);
    const next = findTag("when", state);
    state.idx = next;
  },

  when(state, { args }) {
    findTag("endcase", state);
    if (!state.buf.buf[state.buf.buf.length - 1].startsWith("switch")) {
      state.buf.buf[state.buf.buf.length - 1] = "";
    }
    const [arg] = splitString(args, " ", 1);
    state.buf.addPlain(`case ${arg}:`);
    state.idx++;
  },

  default(state) {
    findTag("endcase", state);
    state.buf.addPlain("default:");
    state.idx++;
  },

  endcase: blockEnd,

  /**
   * Case1: `{% for value in iterable %}`
   * Case2: `{% for [el1, el2] in [[a, b], [a, b]] %}`
   * Case3: `{% for {a, b} in [{ a, b }, { a, b }] %}`
   * Case4: `{% for indexer, value in iterable %}`
   * Along with two filters: limit and index.
   *
   * The output (excluding filters) is always:
   *  ``` js
   *  for (const [indexer, value] of Object.entries(iterable))
   *  ```
   *  indexer evaluates to a string (and not number)
   *  value can be a simple identifier/array literal/object literal.
   */
  for(state, { args, filters }) {
    findTag("endfor", state);
    const loop = getLoopComponents(args);
    if (!loop.indexer) loop.indexer = "_" + state.context.length;

    state.context.create();
    loop.ids.forEach((id, i) => {
      if (!id && i === 0 && loop.ids.length !== 1) return;
      if (!isValidVariableName(id)) {
        const ctx = errorContext2(state);
        const msg = `Invalid identifier "${id}" in for loop`;
        throw new BirkError(msg, "Compile", ctx);
      }
      state.context.add(id);
    });

    const { iterable } = loop;
    addLocal(iterable, state);

    const rangeRegex = /(-?\w+)\.\.(-?\w+)/;
    const itr = rangeRegex.test(iterable) ? createRange(iterable) : iterable;
    const { indexer, value } = loop;

    state.buf.addPlain(`_r_.uniter(${itr}, \`${itr}\`);`);
    let output = `for (const [${indexer}, ${value}] of Object.entries(${itr}))`;

    const loopFilters = filters.filter(
      f => f.name === "offset" || f.name === "limit"
    );
    if (loopFilters.length) {
      const offset = loopFilters.find(f => f.name === "offset");
      const limit = loopFilters.find(f => f.name === "limit");
      output += "if (";
      if (offset !== undefined) output += `${offset.args[0]} <= ${indexer}`;
      if (offset && limit) output += " && ";
      if (limit !== undefined) output += `${indexer} <= ${limit.args[0]}`;
      output += ") ";
    }
    output += "{";

    state.buf.addPlain(output);
    state.idx += 1; // end + 1;

    /** @param {string} str */
    function createRange(str) {
      const [, start, end] = str.match(rangeRegex);
      return `Array.from({ length: ${end}- ${start}+1 }, (_, i) => ${start}+i)`;
    }
  },
  endfor: blockEnd,

  break: simpleToken,
  continue: simpleToken,

  trim(state) {
    state.tokens[state.idx + 1].val = state.tokens[state.idx + 1].val.trim();
    state.idx += 1;
  },

  mixin(state, { args, val }) {
    const start = state.idx;
    const end = findTag("endmixin", state);
    const [mixinName, _params] = splitString(args, ":", 2);
    if (mixinName.includes(" ")) {
      const suggestion = val.replace(mixinName, mixinName.replace(" ", ": "));
      const msg = `Invalid mixin declaration. Did you mean "${suggestion}"?`;
      throw new BirkError(msg, "Parse", errorContext2(state));
    }
    const [...params] = splitString(_params, ",").filter(s => s.trim());
    params.forEach(param => {
      if (!param.includes(" ")) return;
      const suggestion = val.replace(param, param.replace(" ", ", "));
      const msg = `Invalid mixin declaration. Did you mean "${suggestion}"?`;
      throw new BirkError(msg, "Parse", errorContext2(state));
    });
    // mixin code is generated at later stage
    const tokens = state.tokens.slice(start + 1, end);
    state.mixins.set(mixinName, { params, tokens });
    state.idx = end + 1;
  },

  extends(state) {
    // `extends` should not exist after preprocessing
    // it means, extends wasn't the first tag in template
    // or extends isn't registered (like in browser)
    const ctx = errorContext2(state);
    const msg =
      "Invalid use of `extends` tag." +
      " Make sure extends is the first tag in template.";
    throw new BirkError(msg, "Compile", ctx);
  },

  block(state, { args }) {
    const end = findTag("endblock", state);
    const { idx: start, file } = state;
    const [name] = splitString(args, " ", 1);
    // block code is generated at later stage
    const tokens = state.tokens.slice(start + 1, end);
    let idx;
    if (state.blocks.has(name)) {
      idx = state.blocks.get(name).idx;
    } else {
      idx = state.buf.buf.length;
      state.buf.addPlain("");
    }
    state.blocks.set(name, { tokens, idx, file });
    state.idx = end + 1;
  },

  _file_(state, { args }) {
    state.file = args;
    state.buf.addPlain(`_file_ = "${state.file}";`);
    state.idx += 1;
  },
};

// tag specific utils
/** @param {State} state */
function blockEnd(state) {
  state.buf.addPlain("}");
  state.context.destroy();
  state.idx += 1;
}
/** @param {State} state, @param {Token} token */
function simpleToken(state, token) {
  state.buf.addPlain(token.name + ";");
  state.idx += 1;
}

/** Split loop args, i.e., content after `{% for` until first `|` or till `%}`
 * into loop's components:
 * front: variable names
 * Loop types:
 *  a: for value in iterable
 *  b: for indexer, value in iterable
 *  value can be:
 *    1. basic identifier
 *    2. object literal
 *    3. array literal
 *  key is an identifier
 * @param {string} args
 * */
function getLoopComponents(args) {
  const [front, iterable] = args.split(" in ", 2);
  if (!iterable) throw new Error("Invalid for loop");
  const result = {};
  result.iterable = iterable;

  // remove starting { or [ and ending } or ], then split at comma
  /** @type {(s: string) => string[]} */
  const split = s =>
    s
      .slice(1, -1)
      .split(",")
      .map(i => i.trim());
  /** @param {string[]} ids, @param {string} type */
  const loopValue = (ids, type) => {
    if (type[1] === "2") return `{${ids.join(", ")}}`;
    if (type[1] === "3") return `[${ids.join(", ")}]`;
    return ids[0];
  };

  if (!front.includes(",")) {
    result.type = "a";
    if (front.startsWith("{")) {
      result.type += "2";
      result.ids = split(front);
    } else if (front.startsWith("[")) {
      result.type += "3";
      result.ids = split(front);
    } else {
      result.ids = [front];
      result.type += "1";
    }
    result.value = loopValue(result.ids, result.type);
    return result;
  }

  let value = front;
  if (/^\w+,/.test(front)) {
    result.type = "b";
    const [indexer, val] = splitString(front, ",", 1);
    result.indexer = indexer;
    value = val.replace(/^\s*,/, "").trim();
  } else {
    result.type = "a";
  }

  if (value.startsWith("{")) {
    result.type += "2";
    result.ids = split(value);
  } else if (value.startsWith("[")) {
    result.type += "3";
    result.ids = split(value);
  } else {
    result.type += "1";
    result.ids = [value];
  }

  result.value = loopValue(result.ids, result.type);
  return result;
}

export default tags;
