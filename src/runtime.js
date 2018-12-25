const filters = require("./filters");
const { errorContext } = require("./utils");

module.exports = { filters, rethrow, context: errorContext };

function rethrow(err, ctx, BirkError) {
  throw new BirkError(err.message, '', ctx);
}
