// @ts-check
const path = require("path");
const { readFile } = require("fs").promises;

const { asUnixPath, addIndent, BirkError, getContext } = require("./utils");

// {% include "filename" %}
const regex = /{%\s*include (?:"|'|)([a-zA-z0-9_\-\.\/\s]+)(?:"|'|)\s*%}/;

/**
 * @param {string} input
 * @param {{ fileName: FilePath, includesDir: FilePath, baseDir: FilePath }} options
 */
async function preProcess(input, options) {
  const { fileName, baseDir, includesDir } = options;

  /** @type {Map<FilePath, FilePath[]>} */
  const dependencyTree = new Map();

  /** @type {Map<FilePath, string>} */
  const cache = new Map();

  const file = rel(fileName);
  cache.set(file, input);
  let processedText = await substitute(input, file);
  processedText = wrapDebugInfo(processedText, 0, file, file);

  const dependencies = new Set([].concat(...[...dependencyTree.values()]));

  return {
    fileMap: cache,
    dependencies: [...dependencies],
    dependencyTree,
    text: processedText,
  };

  /**
   * @param {string} content
   * @param {FilePath} file
   */
  async function substitute(content, file) {
    const lines = content.split("\n");
    const matchedLines = getAllMatches(lines);

    // base case
    if (!matchedLines.length) {
      return content;
    }

    const includedFiles = matchedLines.map(({ file: f }) =>
      path.join(includesDir, path.posix.normalize(f))
    );

    if (dependencyTree.get(file)) {
      console.log(dependencyTree);
      throw new Error("Cyclic dependencies found.");
    }
    dependencyTree.set(file, includedFiles.map(rel));

    const substitutions = await getSubstitutions(
      includedFiles,
      matchedLines,
      file,
      cache
    );

    for (const { line, indent, index } of matchedLines) {
      const substitution = addIndent(indent, substitutions[index]);
      // recursive call
      lines[line] = await substitute(substitution, rel(includedFiles[index]));
    }

    return lines.join("\n");
  }

  /**
   * Get substitution string for each filePath
   * This messy function exists so the we don't read same file multiple times!
   * @typedef {string} FilePath
   * @param {FilePath[]} files
   * @param {ReturnType<typeof getAllMatches>} matchedLines
   * @param {FilePath} parentFile
   * @param {Map<FilePath, string>} cache
   */
  async function getSubstitutions(files, matchedLines, parentFile, cache) {
    /** @type {Map<FilePath, {length: string, id: number[]}>} */
    const substitutionMap = files.reduce((unique, file, i) => {
      if (!unique.has(file)) {
        const { length, match } = matchedLines[i];
        unique.set(file, { match, length, id: [] });
      }
      unique.get(file).id.push(i);
      return unique;
    }, new Map());

    const uniqueFiles = [...substitutionMap.keys()];

    const promises = uniqueFiles.map(file =>
      cache.has(rel(file))
        ? Promise.resolve(cache.get(rel(file)))
        : readFile(file, "utf8")
    );

    /** @type {string[]} */
    let contents;
    try {
      contents = await Promise.all(promises);
    } catch (error) {
      const context = includeErrorContext(
        error,
        parentFile,
        substitutionMap,
        cache
      );
      throw new BirkError(
        `Failed to resolve include.\n${error.message}`,
        "BirkPreprocessorError",
        context
      );
    }

    uniqueFiles.map((file, i) => {
      file = rel(file);
      cache.set(file, contents[i]);
    });

    // return substitition for each include
    return [...substitutionMap.entries()].reduce(
      (subs, [file, { length, id: indexes }]) => {
        file = rel(file);
        const sub = wrapDebugInfo(cache.get(file), length, file, parentFile);
        for (const i of indexes) {
          subs[i] = sub;
        }
        return subs;
      },
      /** @type {string[]} */ (Array.from({ length: files.length }))
    );
  }

  /**
   * Get the matches for `{% include "filename" %}` tag
   * @param {string[]} lines content of a file
   */
  function getAllMatches(lines) {
    const matchedLines = [];
    let j = 0;
    for (let i = 0, l = lines.length; i < l; ++i) {
      if (regex.test(lines[i])) {
        const match = lines[i].match(regex);
        const indent = lines[i].search(/\S/);
        matchedLines.push({
          match: match[0],
          length: match[0].length,
          line: i,
          file: match[1].trim(),
          indent,
          index: j++,
        });
      }
    }
    return matchedLines;
  }

  /**
   * @param {string} content
   * @param {FilePath} current
   * @param {FilePath} parent
   */
  function wrapDebugInfo(content, length, current, parent) {
    let wrapped = `{# beg ${length} ${current} #}`;
    wrapped += content.trim();
    wrapped += `{# end ${0} ${parent} #}`;
    return wrapped;
  }

  function rel(p) {
    return asUnixPath(path.relative(baseDir, p));
  }
}

function includeErrorContext(error, parentFile, substitutionMap, cache) {
  const errMatch = error.message.match(/open (?:'|")(.*)(?:'|")/);
  const filePath = errMatch[1].trim();
  let context;
  if (substitutionMap.has(filePath)) {
    const { match } = substitutionMap.get(filePath);
    const pos = cache.get(parentFile).search(match);
    if (pos !== -1) {
      context = getContext(pos, parentFile, cache, true);
    }
  }
  return context;
}

module.exports = { preProcess };
