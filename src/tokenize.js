// @ts-check
import { splitString, errorContext, BirkError, Stack } from "./utils";

/**
 * @typedef {import("birk").Token} Token
 * @param {string} input
 * @param {Map<string, string>} fileMap
 */
export default function tokenize(input, fileMap) {
  /** @type {Token[]} */
  const tokens = [];
  const lookUpMap = new Map([["object", "{{"], ["tag", "{%"], ["_inc_", "{#"]]);
  const ptrStack = new Stack();
  ptrStack.push(0);
  const fileStack = new Stack();
  fileStack.push("");

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
      // ideally never reached. keeping as a safety measure
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
    const filters = parseFilters(_filters);
    tokens.push({
      type: "object",
      fpos: ptrStack.v,
      name: name.trim().replace(/\n/g, "\\n"),
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
    const [tag, ..._filters] = splitString(match, "|");
    const filters = parseFilters(_filters);
    const [name, args] = splitString(tag, " ", 1);
    tokens.push({
      type: "tag",
      fpos: ptrStack.v,
      name,
      args,
      filters,
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
      args: file,
      filters: [],
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
  function search(needle, start, needleName) {
    const i = input.indexOf(needle, start + 2);
    if (i === -1) {
      const ctx = errorContext(ptrStack.v, fileStack.v, fileMap);
      const msg = `Malformed token. Failed to find ${needleName} "${needle}.`;
      throw new BirkError(msg, "Parse", ctx);
    }

    for (const bad of ["{{", "{%"]) {
      const j = input.indexOf(bad, start + 2);
      if (j === -1) continue;
      if (j < i) {
        const ctx = errorContext(ptrStack.v + 2, fileStack.v, fileMap);
        const msg =
          `Malformed token. Failed to find ${needleName} "${needle}.` +
          ` Found "${bad}" instead"`;
        throw new BirkError(msg, "Parse", ctx);
      }
    }
    return i;
  }

  /**
   * @param {string[]} list an array built by splitting a string at `|`
   */
  function parseFilters(list) {
    // splitString returns text remaining after split with a limit as last item
    if (list[list.length - 1] === "") list.pop();

    const filters = [];
    for (const filter of list) {
      const [filterName, _args] = splitString(filter, ":", 2);
      const args = _args ? splitString(_args, ",").filter(s => s.trim()) : [];
      const name = filterName.trim();
      if (name.includes(" ")) {
        const ctx = errorContext(ptrStack.v + 2, fileStack.v, fileMap);
        const suggestion = name.replace(" ", ": ");
        const msg = `Invalid filter usage. Did you mean "${suggestion}"?`;
        throw new BirkError(msg, "Parse", ctx);
      }
      filters.push({ name, args });
    }
    return filters;
  }
}
