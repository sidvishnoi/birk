const filters = require("./filters");
const { BirkError, errorContext } = require("./utils");

module.exports = { filters, rethrow, context: errorContext, BirkError };

function rethrow(err, ctx, BirkError) {
  throw new BirkError(err.message, "", ctx);
}
