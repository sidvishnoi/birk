import filters from "./filters";
import { BirkError, errorContext } from "./utils";

const rethrow = (pos, file, runtime, err, msg) => {
  const reFilterUndef = /([$\w]+) is not a function/;
  let message = err ? err.message : "";
  if (reFilterUndef.test(message)) {
    const filterName = message.match(reFilterUndef)[1];
    if (runtime._filters.has(filterName)) {
      message = `"${filterName}" is not a valid filter`;
    }
  }
  if (msg) {
    message += `${" "}(${msg})`;
  }
  const ctx = runtime.context(pos, file, runtime._fileMap);
  throw new BirkError(message, "", ctx);
};

const undef = (v, i) => !v ? `${i} is ${JSON.stringify(v)}` : "";
const uniter = (v, i) => {
  if (!v || typeof v === "number") {
    throw new Error(`${i} is not iterable`);
  }
};

export {
  filters,
  rethrow,
  errorContext as context,
  BirkError,
  undef,
  uniter,
};
