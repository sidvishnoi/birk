const {
  compileFile,
  compileString,
  compileStringAsync,
  generatorNode,
  renderFile,
  renderString,
  renderStringAsync,
} = require("./lib");

module.exports = {
  compileFile: (options) => {
    options._generator = generatorNode;
    return compileFile(options);
  },
  compileString: (str, options) => {
    options._generator = generatorNode;
    return compileString(str, options);
  },
  compileStringAsync: (str, options) => {
    options._generator = generatorNode;
    return compileStringAsync(str, options);
  },
  renderFile: (locals, options) => {
    options._generator = generatorNode;
    return renderFile(locals, options);
  },
  renderString: (str, locals, options) => {
    options._generator = generatorNode;
    return renderString(str, locals, options);
  },
  renderStringAsync: (str, locals, options) => {
    options._generator = generatorNode;
    return renderStringAsync(str, locals, options);
  },
};
