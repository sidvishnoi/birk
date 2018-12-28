// @ts-check

import {
  addLocal,
  BirkError,
  findTag,
  isValidVariableName,
  splitString,
  errorContext2,
} from "./utils";

/**
 * @typedef {import("birk").State} State
 * @typedef {import("birk").TagToken} Token
 * @typedef {import("birk").Tag} Tag
 * @type {{ [name: string]: Tag }}
 */
const tags = {
  assign(state, { args }) {
    const [name] = args;
    if (state.context.has(name)) {
      state.buf.addPlain(`${args.join(" ")};`);
    } else {
      state.context.add(name);
      state.buf.addPlain(`let ${args.join(" ")};`);
    }
    state.idx += 1;
  },

  capture(state, { args }) {
    const end = findTag("endcapture", state, true);

    let capturedValue = "";
    for (let i = state.idx + 1; i < end; ++i) {
      state.buf.addDebug(state);
      capturedValue += state.tokens[i].val;
    }

    const [name] = args;
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
    state.buf.addPlain(`if (${args.join(" ")}) {`);
    state.idx += 1;
  },

  elseif(state, { args }) {
    findTag("endif", state);
    state.context.destroy();
    state.context.create();
    state.buf.addPlain(`} else if (${args.join(" ")}) {`);
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
    state.buf.addPlain(`switch (${args[0]}) {`);
    const next = findTag("when", state);
    state.idx = next;
  },

  when(state, { args }) {
    findTag("endcase", state);
    if (!state.buf.buf[state.buf.buf.length - 1].startsWith("switch")) {
      state.buf.buf[state.buf.buf.length - 1] = "";
    }
    state.buf.addPlain(`case ${args[0]}:`);
    state.idx++;
  },

  default(state) {
    findTag("endcase", state);
    state.buf.addPlain("default:");
    state.idx++;
  },

  endcase: blockEnd,

  /**
   * Case1: `{% for value in array %}`
   * Case2: `{% for [el1, el2] in [[a, b], [a, b]] %}`
   * Case3: `{% for {a, b} in [{ a, b }, { a, b }] %}`
   * Case4.1: `{% for index, value in array %}`
   * Case4.2: `{% for key, value in object %}`
   * Case4.3: `{% for index, value in array | offset: o | limit: l %}`
   */
  for(state, { args }) {
    findTag("endfor", state);
    const loop = getLoopComponents(args);

    state.context.create();
    loop.ids.forEach(id => {
      if (!isValidVariableName(id)) {
        const ctx = errorContext2(state);
        throw new BirkError("Invalid identifiers in for loop", "Compile", ctx);
      }
      state.context.add(id);
    });

    const { iterable } = loop;
    addLocal(iterable, state);

    let output = `for (const ${loop.front} of `;

    const rangeRegex = /(-?\w+)\.\.(-?\w+)/;
    if (rangeRegex.test(iterable)) {
      const range = createRange(iterable);
      output += loop.type === 1 ? range : `Object.entries(${range})`;
    } else {
      output += loop.type === 1 ? iterable : `Object.entries(${iterable})`;
    }
    output += ") ";

    if (loop.offset || loop.limit) {
      const { offset, limit, indexer } = loop;
      output += "if (";
      if (offset !== undefined) output += `${offset} <= ${indexer}`;
      if (offset && limit) output += " && ";
      if (limit !== undefined) output += `${indexer} <= ${limit}`;
      output += ") ";
    }
    output += "{";

    state.buf.addPlain(output);
    state.idx += 1; // end + 1;

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

  mixin(state, { args }) {
    const start = state.idx;
    const end = findTag("endmixin", state);
    const [mixinName, ...params] = args;
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
    const msg = "Invalid use of `extends` tag." +
      " Make sure extends is the first tag in template.";
    throw new BirkError(msg, "Compile", ctx);
  },

  block(state, { args }) {
    const end = findTag("endblock", state);
    const { idx: start, file } = state;
    const [name] = args;
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
    const file = args[1];
    state.file = file;
    state.buf.addPlain(`_file_ = "${file}";`);
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

/** @param {string[]} args */
function getLoopComponents(args) {
  const pos = args.indexOf("in");
  if (pos === -1) throw new Error("Invalid for loop");

  let front = args.slice(0, pos).join(" ");
  const ids = new Set();

  let type;
  let indexer;
  if (pos === 1) type = 1;

  const idStart = args[0][0];
  const idEnd = args[pos - 1].slice(-1);

  let canLimitOffset = false;

  if (front.includes(",") && idStart !== "[" && idStart !== "{") {
    // for key, val of object
    // for idx, val of array
    canLimitOffset = true;
    type = 2;
    const its = front.split(/\s*,\s*/);
    its.forEach(i => i && ids.add(i));
    indexer = its[0];
    front = `[ ${front} ]`;
  } else {
    if (
      (idStart === "{" && idEnd === "}") ||
      (idStart === "[" && idEnd === "]")
    ) {
      type = 1;
      const its = front.slice(1, -1).split(/\s*,\s*/);
      its.forEach(i => i.trim() && ids.add(i.trim()));
    } else {
      ids.add(front);
    }
  }

  const back = args.slice(pos + 1).join(" ");
  const backItems = splitString(back, "|").map(s => s.trim());
  const iterable = backItems[0];

  let offset, limit;
  if (canLimitOffset) {
    const off = backItems.find(item => item.startsWith("offset"));
    if (off) {
      offset = off.replace(":", "").split(" ").map(s => s.trim())[1];
    }
    const lim = backItems.find(item => item.startsWith("limit"));
    if (lim) {
      limit = lim.replace(":", "").split(" ").map(s => s.trim())[1];
    }
  }

  return {
    type,
    indexer,
    front,
    ids,
    iterable,
    offset,
    limit,
  };
}

export default tags;
