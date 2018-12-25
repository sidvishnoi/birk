// @ts-check
// resolves {% include filename %} tags
const path = require("path");
const { readFile: _readFile } = require("fs");
const readFile = require("util").promisify(_readFile);

const { asUnixPath, addIndent, BirkError, errorContext } = require("./utils");

// {% include "filename" %}
const regex = /{%\s*include (?:"|'|)([a-zA-z0-9_\-\.\/\s]+)(?:"|'|)\s*%}/;

/**
 * @param {string} input
 * @param {{ fileName: FilePath, includesDir: FilePath, baseDir: FilePath }} options
 */
module.exports.preProcess = async function preProcess(input, options) {
  const { fileName, baseDir, includesDir } = options;

  /** @type {Map<FilePath, FilePath[]>} */
  const dependencyTree = new Map();

  /** @type {Map<FilePath, string>} */
  const fileMap = new Map();

  const file = rel(fileName);
  fileMap.set(file, input);
  const processedText = await substitute(input, file);
  const processedTextWithDebug = wrapDebugInfo(processedText, "0", file, file);

  return {
    fileMap: fileMap,
    dependencyTree,
    text: processedTextWithDebug,
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
      file
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
   */
  async function getSubstitutions(files, matchedLines, parentFile) {
    /** @type {Map<FilePath, {match: string, length: string, id: number[]}>} */
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
      fileMap.has(rel(file))
        ? Promise.resolve(fileMap.get(rel(file)))
        : readFile(file, "utf8")
    );

    /** @type {string[]} */
    let contents;
    try {
      contents = await Promise.all(promises);
    } catch (error) {
      const context = includeErrorContext(error, parentFile, substitutionMap);
      throw new BirkError(
        `Failed to resolve include.\n${error.message}`,
        "BirkPreprocessorError",
        context
      );
    }

    uniqueFiles.map((file, i) => {
      file = rel(file);
      fileMap.set(file, contents[i]);
    });

    // return substitition for each include
    return [...substitutionMap.entries()].reduce(
      (subs, [file, { length, id: indexes }]) => {
        file = rel(file);
        const sub = wrapDebugInfo(fileMap.get(file), length, file, parentFile);
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
   * create error context for file inclusion failure
   * @param {Error} error
   * @param {FilePath} parentFile
   * @param {Map<FilePath, {match: string, length: string, id: number[]}>} substitutionMap
   */
  function includeErrorContext(error, parentFile, substitutionMap) {
    const errMatch = error.message.match(/open (?:'|")(.*)(?:'|")/);
    const filePath = errMatch[1].trim();
    let context;
    if (substitutionMap.has(filePath)) {
      const { match } = substitutionMap.get(filePath);
      const pos = fileMap.get(parentFile).search(match);
      if (pos !== -1) {
        context = errorContext(pos, parentFile, fileMap);
      }
    }
    return context;
  }

  /**
   * @param {string} content
   * @param {string} length length of {% include filename %} statement
   * @param {FilePath} current current file
   * @param {FilePath} parent current file's parent
   */
  function wrapDebugInfo(content, length, current, parent) {
    return (
      `{# beg ${length} ${current} #}` +
      content.trim() +
      `{# end ${0} ${parent} #}`
    );
  }

  /**
   * return path relative to baseDir
   * @param {string} p
   */
  function rel(p) {
    return asUnixPath(path.relative(baseDir, p));
  }
}
