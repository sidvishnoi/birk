const through2 = require("through2");
const { compileStringAsync } = require("birk");
let runtime = require("birk/runtime");

/**
 * @param {*} locals
 * @param {import("birk").Options} options
 */
module.exports = (locals, options) => {
  /** @type {Map<string, import("birk").Executable>} */
  const cache = new Map();
  if (options.clearCache) {
    options.clearCache = false;
    cache.clear();
    delete require.cache[require.resolve("birk/runtime")];
    runtime = require("birk/runtime");
    Object.assign(runtime.filters, options.filters);
  }

  return through2.obj(transform);

  async function transform(file, enc, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }

    try {
      const template = file.contents.toString();
      const name = file.relative;

      let fn;
      if (cache.has(name)) {
        fn = cache.get(name);
      } else {
        const out = await compileStringAsync(template, options);
        if (out.warnings.length) {
          console.warn(out.warnings);
        }
        console.log(out.localsFullNames);

        fn = out.fn;
        cache.set(name, fn);
      }

      const output = fn(locals, runtime);
      file.contents = Buffer.from(output);
      cb(null, file);
    } catch (error) {
      cb(new Error("gulp-birk" + " => " + error.message));
    }
  }
};
