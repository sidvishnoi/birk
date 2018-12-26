import filters from "./filters";
import { BirkError, errorContext } from "./utils";

const rethrow = (err, ctx, BirkError, m) => {
  let msg = err.message;
  if (m) msg += `${" "}(${m})`;
  throw new BirkError(msg, "", ctx);
};

const undef = (v, i) => !v ? `${i} is ${JSON.stringify(v)}` : "";

export {
  filters,
  rethrow,
  errorContext as context,
  BirkError,
  undef,
};
