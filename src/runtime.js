const filters = require("./filters");
const { BirkError, errorContext } = require("./utils");

const rethrow = (err, ctx, BirkError, m) => {
  let msg = err.message;
  if (m) msg += `${" "}(${m})`;
  throw new BirkError(msg, "", ctx);
};

const undef = (v, i) => !v ? `${i} is ${JSON.stringify(v)}` : "";

module.exports = {
  filters,
  rethrow,
  context: errorContext,
  BirkError,
  undef,
};
