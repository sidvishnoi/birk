/** @type {import("..").renderFile} */
const { renderFile } = require("../build/node");
const path = require("path");

describe("Tags - include", () => {
  const baseDir = path.join(__dirname, "fixtures", "includes");
  const includesDir = path.join(baseDir, "_includes");
  const baseOptions = { baseDir, includesDir };

  test("Simple Includes", async () => {
    const opts = { fileName: path.join(baseDir, "simple.birk") };
    const options = { ...baseOptions, ...opts };

    const out = await renderFile({}, options);
    expect(out).toEqual("SIMPLE\nA\nB\nA\nB\nbody { background: black; }");
  });

  test("Include Not Found", async () => {
    const opts = { fileName: path.join(baseDir, "not-found.birk") };
    const options = { ...baseOptions, ...opts };

    try {
      await renderFile({}, options);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toMatch("Failed to resolve include");
      expect(e.message).toMatch(">> 2| {% include \"ceases-to-exist.birk\" %}");
    }
  });

  test("Nested Includes", async () => {
    const opts = { fileName: path.join(baseDir, "nested.birk") };
    const options = { ...baseOptions, ...opts };

    const out = await renderFile({}, options);
    expect(out).toEqual("NESTED\nC\nD\nA\nA");
  });

  test("Circular Includes", async () => {
    const opts = { fileName: path.join(baseDir, "circular.birk") };
    const options = { ...baseOptions, ...opts };

    try {
      await renderFile({}, options);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toEqual("Cyclic dependencies found.");
    }
  });
});

describe("Tags - extends & block", () => {
  const baseDir = path.join(__dirname, "fixtures", "extends");
  const baseOptions = { baseDir, includesDir: baseDir };

  test("Doesn't extend if extends is not first tag", async () => {
    const opts = { fileName: path.join(baseDir, "no-extend.birk") };
    const options = { ...baseOptions, ...opts };

    try {
      await renderFile({}, options);
    } catch (e) {
      expect(e.message).toMatch(/Invalid use of `extends` tag/i);
    }
  });

  test("Uses given blocks", async () => {
    const opts = { fileName: path.join(baseDir, "parent.birk") };
    const options = { ...baseOptions, ...opts };

    const out = await renderFile({}, options);
    const expected =
      "PARENT\n" +
      "<header-p></header-p>\n" +
      "<content-p></content-p>\n" +
      "<footer-p></footer-p>";
    expect(out).toEqual(expected);
  });

  test("throws error if parent doesn't exist", async () => {
    const opts = { fileName: path.join(baseDir, "error.birk") };
    const options = { ...baseOptions, ...opts };

    try {
      await renderFile({}, options);
    } catch (e) {
      expect(e.message).toMatch(/Failed to resolve parent template.+404\.birk/);
      expect(e.message).toMatch(">> 1| {% extends 404.birk %}");
    }
  });

  test("Uses blocks from parent if child doesn't override", async () => {
    const opts = { fileName: path.join(baseDir, "child.birk") };
    const options = { ...baseOptions, ...opts };

    const out = await renderFile({}, options);
    const expected =
      "PARENT\n" +
      "<header-p></header-p>\n" +
      "<content-c></content-c>\n" +
      "<footer-p></footer-p>\n" +
      "C1\n\nC2";
    expect(out).toEqual(expected);
  });
});
