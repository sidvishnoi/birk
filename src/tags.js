/**
 * @typedef {import("./codegen.js").State} State
 * @typedef {import("./tokenize.js").TagToken} Token
 */

const { findTag, splitString } = require("./utils");

module.exports.assign = (token, state) => {
  const [name] = token.args;
  if (state.assign.has(name)) {
    state.buf.addPlain(`${token.args.join(" ")};`);
  } else {
    state.assign.add(name);
    state.buf.addPlain(`let ${token.args.join(" ")};`);
  }
  state.idx += 1;
};

module.exports.capture = (token, state) => {
  const start = state.idx + 1;
  const end = findTag("endcapture", state);

  let capturedValue = "";
  for (let i = start; i < end; ++i) {
    state.buf.addDebug(state.tokens[i]);
    capturedValue += state.tokens[i].val;
  }

  const [name] = token.args;
  if (state.assign.has(name)) {
    state.buf.addPlain(`${name} = \`${capturedValue}\`;`);
  } else {
    state.assign.add(name);
    state.buf.addPlain(`let ${name} = \`${capturedValue}\`;`);
  }

  state.idx = end + 1;
};

module.exports.raw = (token, state) => {
  const start = state.idx + 1;
  const end = findTag("endraw", state);
  for (let i = start; i < end; ++i) {
    state.buf.addDebug(state.tokens[i]);
    state.buf.add(state.tokens[i].val, true);
  }
  state.buf.addDebug(state.tokens[end]);
  state.idx = end + 1;
};

module.exports.js = (token, state) => {
  const start = state.idx + 1;
  const end = findTag("endjs", state);
  for (let i = start; i < end; ++i) {
    state.buf.addDebug(state.tokens[i]);
    state.buf.addPlain(state.tokens[i].val.trim());
  }
  state.buf.addDebug(state.tokens[end]);
  state.idx = end + 1;
};

module.exports.comment = (token, state) => {
  const end = findTag("endcomment", state);
  state.idx = end + 1;
};

module.exports.if = (token, state) => {
  findTag("endif", state);
  state.buf.addPlain(`if (${token.args.join(" ")}) {`);
  state.idx += 1;
};
module.exports.elseif = (token, state) => {
  findTag("endif", state);
  state.buf.addPlain(`} else if (${token.args.join(" ")}) {`);
  state.idx += 1;
};
module.exports.else = (token, state) => {
  findTag("endif", state);
  state.buf.addPlain(`} else {`);
  state.idx += 1;
};
module.exports.endif = blockEnd;

module.exports.case = (token, state) => {
  findTag("endcase", state);
  state.buf.addPlain(`switch (${token.args[0]}) {`);
  state.idx += 1;
};
module.exports.when = (token, state) => {
  findTag("endcase", state);
  if (state.buf.buf[state.buf.buf.length - 1].trim().endsWith(";")) {
    // assume previous was a case/when
    state.buf.addPlain("break;");
  }
  state.buf.addPlain(`case ${token.args[0]}:`);
  state.idx++;
};
module.exports.default = (token, state) => {
  findTag("endcase", state);
  if (state.buf.buf[state.buf.buf.length - 1].trim().endsWith(";")) {
    // assume previous was a case/when
    state.buf.addPlain("break;");
  }
  state.buf.addPlain(`default:`);
  state.idx++;
};
module.exports.endcase = blockEnd;

/**
 * case1: for key in object
 * case2: for value of array
 * case3: for [el1, el2] of [[a, b], [a, b]]
 * case4: for {a, b} of [{ a, b }, { a, b }]
 * case5: for index, value of array
 * case6: for key, value of object
 */
module.exports.for = (token, state) => {
  findTag("endfor", state);

  const {
    type, front, join, iterable, offset, limit, indexer
  } = getLoopComponents(token.args);

  let output = `for (const ${front} ${join} `;

  const rangeRegex = /(\w+)\.\.(\w+)/;
  if (rangeRegex.test(iterable)) {
    output += createRange(iterable);
  } else {
    output += type === 1 ? iterable : `Object.entries(${iterable})`;
  }
  output += ") ";

  if (offset || limit) {
   output += "if (";
   if (offset) output += `${indexer} > ${offset}`;
   if (offset && limit) output += " && ";
   if (limit) output += `${indexer} < ${limit}`;
   output += ") ";
  }
  output += "{";

  state.buf.addPlain(output);
  state.idx += 1; // end + 1;

  function createRange(str) {
    const [_, start, end] = str.match(rangeRegex);
    return `Array.from({ length: ${end}-${start}+1 }, (_, i) => ${start}+i)`;
  }
};
module.exports.endfor = blockEnd;

module.exports.break = simpleToken;
module.exports.continue = simpleToken;

/** @param {Token} token, @param {State} state */
module.exports.mixin = (token, state) => {
  const start = state.idx;
  const end = findTag("endmixin", state);
  const [mixinName, ...params] = token.args;
  // mixin code is generated at later stage
  const tokens = state.tokens.slice(start + 1, end);
  state.mixins.set(mixinName, { params, tokens });
  state.idx = end + 1;
};

module.exports._file_ = (token, state) => {
  state.buf.addPlain(`_file_ = "${token.args[1]}";`);
  state.idx += 1;
};

// tag specific utils
function blockEnd(token, state) {
  state.buf.addPlain("}");
  state.idx += 1;
}

function simpleToken(token, state) {
  state.buf.addPlain(token.name + ";");
  state.idx += 1;
}

function getLoopComponents(args) {
  let pos = args.indexOf("of");
  if (pos === -1) pos = args.indexOf("in");
  if (pos === -1) throw new Error("Invalid for loop");

  const front = args.slice(0, pos);

  let type;
  let indexer;
  if (pos === 1) type = 1;

  const idStart = args[0][0];
  const idEnd = args[pos - 1].slice(-1);

  let canLimitOffset = false;
  if (pos === 2 && idStart !== "[" && idStart !== "{") {
    // for key, val of object
    // for idx, val of array
    canLimitOffset = true;
    type = 2;
    indexer = front[0].replace(",", "").trim();
    front.unshift("[");
    front.push("]");
  } else {
    if (idStart === "{" && idEnd === "}") type = 1;
    else if (idStart === "[" && idEnd === "]") type = 1;
  }

  const back = args.slice(pos + 1).join(" ");
  const backItems = splitString(back, "|").map(s => s.trim());
  const iterable = backItems[0];

  let offset, limit;
  if (canLimitOffset) {
    const off = backItems.find(item => item.startsWith("offset"));
    if (off) {
      offset = off.split(" ").map(Number).find(Number);
    }
    const lim = backItems.find(item => item.startsWith("limit"));
    if (lim) {
      limit = lim.split(" ").map(Number).find(Number);
    }
  }

  return {
    type,
    indexer,
    front: front.join(" "),
    join: args[pos],
    iterable,
    offset,
    limit,
  };
}
