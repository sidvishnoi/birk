const { promisify } = require("util");
const path = require("path");
const { readFile, outputFile, copy } = require("fs-extra");
const glob = promisify(require("glob"));
const chokidar = require("chokidar");
const graymatter = require("gray-matter");
const { compileFile } = require("birk");
const birk = require("birk/runtime");
const marked = require("./marked");

const OUT_DIR = path.join(process.cwd(), "site", "birk");
const LAYOUTS_DIR = path.join(process.cwd(), "layouts");
const ASSETS_DIR = path.join(process.cwd(), "assets");
const INCLUDES_DIR = path.join(LAYOUTS_DIR, "includes");
const CONTENT_DIR = path.join(process.cwd(), "docs");

const options = {
  baseDir: LAYOUTS_DIR,
  includesDir: INCLUDES_DIR,
  filters: {
    markdown(str) {
      return marked(str);
    },
  },
};
Object.assign(birk.filters, options.filters);

const caches = {
  /** @type Map<string, import("birk").Executable> */
  layouts: new Map(),
  /** @type Map<string, object> */
  content: new Map(),
  /** @type Map<string, Set<string>> */
  deps: new Map(),
};

async function main() {
  const globOptions = { absolute: true, nodir: true };
  const layoutFiles = await glob("layouts/*.birk", globOptions);
  const contentFiles = await glob("docs/**/*.md", globOptions);
  try {
    const promises = layoutFiles
      .map(compileLayout)
      .concat(contentFiles.map(readContentFile));
    await Promise.all(promises);
  } catch (e) {
    console.error(e.toString());
  }

  const assets = await glob("assets/**/*", globOptions);
  const copyAssetPromises = assets.map(copyAsset);
  await Promise.all(copyAssetPromises);

  caches.content.forEach(async (data, file) => {
    try {
      await renderAndWrite(file, data);
    } catch (e) {
      console.error(e.message);
    }
  });

  if (process.argv.includes("--watch")) {
    watch();
  }
}

async function compileLayout(file) {
  const name = path.basename(file, ".birk");
  console.log(`Compile: ${name}`);
  const compiled = await compileFile({
    ...{ fileName: file },
    ...options,
  });
  caches.layouts.set(name, compiled.fn);
  return name;
}

async function readContentFile(file) {
  file = path.normalize(file);
  const text = await readFile(file, "utf8");
  const matter = graymatter(text, { language: "yaml", excerpt: false });
  const { content, data } = matter;
  if (!data.layout) data.layout = "default";
  if (!caches.deps.has(data.layout)) caches.deps.set(data.layout, new Set());
  caches.deps.get(data.layout).add(file);
  const allData = Object.assign(data, { content });
  caches.content.set(file, allData);
  return allData;
}

async function renderAndWrite(file, data) {
  console.log(`Render: ${path.relative(CONTENT_DIR, file)}`);
  const layout = caches.layouts.get(data.layout);
  const locals = {
    page: data,
    pages: [...caches.content.values()].reduce((pages, p) => {
      pages[p.url] = p.title;
      return pages;
    }, {}),
  }
  const html = layout(locals, birk);
  const url = path.posix.normalize(
    "./" + (data.url || path.basename(file, ".md"))
  );
  const location = path.join(OUT_DIR, url, "index.html");
  await outputFile(location, html);
}

async function copyAsset(file) {
  console.log(`Copy: ${path.relative(ASSETS_DIR, file)}`);
  const base = path.relative(ASSETS_DIR, file);
  const out = path.join(OUT_DIR, "assets", base);
  await copy(file, out);
}

function watch() {
  console.log("Watching for changes...");
  chokidar
    .watch(["layouts", "docs", "assets"], {
      ignoreInitial: true,
    })
    .on("change", watchHandler);
}

async function watchHandler(name) {
  const file = path.join(process.cwd(), name);
  try {
    switch (getType(file)) {
      case "layout":
        const layout = await compileLayout(file, caches.layouts);
        const files = caches.deps.get(layout) || new Set();
        const promises = [...files].map(file =>
          renderAndWrite(file, caches.content.get(file))
        );
        return await Promise.all(promises);
      case "content":
        const data = await readContentFile(file);
        caches.content.set(file, data);
        return renderAndWrite(file, data);
      case "asset":
        return await copyAsset(file);
      default:
        break;
    }
  } catch (e) {
    console.error(e.toString());
  }
}

function getType(file) {
  const dir = path.dirname(file);
  if (dir.includes(LAYOUTS_DIR) && !dir.includes(INCLUDES_DIR)) {
    return "layout";
  }
  if (dir.includes(CONTENT_DIR)) {
    return "content";
  }
  if (dir.includes(ASSETS_DIR)) {
    return "asset";
  }
  return "unknown";
}

main().catch(console.error);
