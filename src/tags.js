// @ts-check

const { findTag, splitString, getIdentifierBase } = require("./utils");

/**
 * @typedef {import("./codegen.js").State} State
 * @typedef {import("./tokenize.js").TagToken} Token
 * @typedef { (state: State, token?: Token) => void } Tag
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
    const end = findTag("endcapture", state);

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
    const end = findTag("endraw", state);
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
    const end = findTag("endcomment", state);
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

  /*
   * case1: for key in object
   * case2: for value of array
   * case3: for [el1, el2] of [[a, b], [a, b]]
   * case4: for {a, b} of [{ a, b }, { a, b }]
   * case5: for index, value of array
   * case6: for key, value of object
   */
  for(state, { args }) {
    findTag("endfor", state);
    const loop = getLoopComponents(args);

    state.context.create();
    loop.ids.forEach(id => state.context.add(id));

    const { iterable } = loop;
    if (!/^(\[|\(|\{)/.test(iterable)) {
      const id = getIdentifierBase(iterable);
      if (!state.context.has(id)) {
        state.locals.add(id);
        state.localsFullNames.add(iterable);
      }
    }

    let output = `for (const ${loop.front} ${loop.join} `;

    const rangeRegex = /(\w+)\.\.(\w+)/;
    if (rangeRegex.test(iterable)) {
      output += createRange(iterable);
    } else {
      output += loop.type === 1 ? iterable : `Object.entries(${iterable})`;
    }
    output += ") ";

    if (loop.offset || loop.limit) {
      const { offset, limit, indexer } = loop;
      output += "if (";
      if (offset !== undefined) output += `${indexer} >= ${offset}`;
      if (offset && limit) output += " && ";
      if (limit !== undefined) output += `${indexer} < ${limit}`;
      output += ") ";
    }
    output += "{";

    state.buf.addPlain(output);
    state.idx += 1; // end + 1;

    function createRange(str) {
      const [, start, end] = str.match(rangeRegex);
      return `Array.from({ length: ${end}-${start}+1 }, (_, i) => ${start}+i)`;
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
function blockEnd(state) {
  state.buf.addPlain("}");
  state.context.destroy();
  state.idx += 1;
}

function simpleToken(state, token) {
  state.buf.addPlain(token.name + ";");
  state.idx += 1;
}

function getLoopComponents(args) {
  let pos = args.indexOf("of");
  if (pos === -1) pos = args.indexOf("in");
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
    its.forEach(i => ids.add(i));
    indexer = its[0];
    front = `[ ${front} ]`;
  } else {
    if (
      (idStart === "{" && idEnd === "}") ||
      (idStart === "[" && idEnd === "]")
    ) {
      type = 1;
      const its = front.slice(1, -1).split(/\s*,\s*/);
      its.forEach(i => ids.add(i.trim()));
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
      offset = off.split(" ").map(s => s.trim())[0];
    }
    const lim = backItems.find(item => item.startsWith("limit"));
    if (lim) {
      limit = lim.split(" ").map(s => s.trim())[0];
    }
  }

  return {
    type,
    indexer,
    front,
    ids,
    join: args[pos],
    iterable,
    offset,
    limit,
  };
}

module.exports = tags;
