module.exports.tokenize = str => {
  const tokens = [];
  let start = 0;

  const lookUpMap = new Map([["object", "{{"], ["tag", "{%"]]);

  while (lookUpMap.size !== 0) {
    let pos = Number.POSITIVE_INFINITY;
    let type;
    for (const [key, val] of lookUpMap) {
      const idx = str.indexOf(val, start);
      if (idx === -1) {
        lookUpMap.delete(key);
      } else if (idx < pos) {
        pos = idx;
        type = key;
      }
    }

    tokens.push({ type: "raw", val: str.slice(start, pos) });
    if (type === "object") {
      start = asObject(pos);
    } else if (type === "tag") {
      start = asTag(pos);
    } else {
      break;
    }
  }

  return tokens;

  function asObject(from) {
    let end = str.indexOf("}}", from);
    const match = str.slice(from + 2, end).trim();
    const [identifier, ...filters] = splitString(match, "|");
    for (let i = 0, flen = filters.length; i < flen; ++i) {
      let [name, args] = splitString(filters[i], ":");
      name = name.trim();
      args = args ? splitString(args, ",").map(arg => arg.trim()) : [];
      filters[i] = { name, args };
    }
    tokens.push({
      type: "object",
      identifier: identifier.trim(),
      filters
    });
    return end + 2;
  }

  function asTag(from) {
    let end = str.indexOf("%}", from);
    const match = str.slice(from + 2, end).trim();
    let [name, ...args] = splitString(match, " ");
    name = name.trim();
    tokens.push({ type: "tag", name, args });
    return end + 2;
  }
};

// split string at `ch` unless `ch` is inside quotes
function splitString(str, ch, limit = 999) {
  const result = [];
  let start = 0;
  let marker = false;
  const { length } = str;
  let i = 0;
  while (i < length) {
    const c = str.charAt(i);
    if (c === '"') {
      marker = !marker;
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

function throwParseError(str, message, pos) {
  const contextLength = [3, 3];
  let posStart = pos;
  let activeLine;
  while (contextLength[0] > 0) {
    const j = str.lastIndexOf("\n", posStart);
    if (j === -1) break;
    if (!activeLine) activeLine = j;
    posStart = j - 1;
    --contextLength[0];
  }

  let posEnd = pos;
  while (contextLength[1] > 0) {
    const j = str.indexOf("\n", posEnd);
    if (j === -1) break;
    if (!activeLine) activeLine = j;
    posEnd = j + 1;
    --contextLength[1];
  }

  const context =
    str.slice(posStart, activeLine + 1) +
    ">>> " +
    str.slice(activeLine + 1, posEnd + 1);

  console.log({ posStart, posEnd, contextLength, activeLine });
  throw new Error(`${message}\n${context}`);
}
