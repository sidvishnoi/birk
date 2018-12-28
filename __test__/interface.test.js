/** @type {import("..")} */
const Birk = require("../build/");
const path = require("path");

describe("Birk Interface", () => {
  describe(".compileString", () => {
    test("defaults work well", () => {
      const input = "<div>Hello Birk</div>";
      const out = Birk.compileString(input);
      expect(out).toMatchObject({
        code: expect.any(String),
        fn: expect.any(Function),
        locals: expect.any(Set),
        warnings: expect.any(Array)
      });
    });

    test("can ask for not creating executable", () => {
      const input = "<div>Hello Birk</div>";
      const options = {
        raw: true,
      };
      const out = Birk.compileString(input, options);
      expect(out).toMatchObject({
        code: expect.any(String),
        fn: undefined,
        locals: expect.any(Set),
        warnings: expect.any(Array)
      });
    });
  });

  describe(".compileStringAsync", () => {
    test("", async () => {
      const input = "<div>Hello Birk</div>";
      const out = await Birk.compileStringAsync(input);
      expect(out).toMatchObject({
        code: expect.any(String),
        fn: expect.any(Function),
        locals: expect.any(Set),
        warnings: expect.any(Array)
      });
    });

    test("throws if invalid options provided", () => {
      const options = {
        fileName: __dirname, // exists
        includesDir: __dirname, // exists
        baseDir: "lalala", // doesn't exist
      };
      return Birk.compileStringAsync("foo", options).catch(e => {
        expect(e.message).toMatch(/Invalid options.baseDir/);
      });
    });
  });

  describe(".compileFile", () => {
    test("throws if fileName not provided", () => {
      const options = {};
      return Birk.compileFile(options).catch(e => {
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toEqual("options.fileName was not provided");
      });
    });

    test("throws if provided fileName doesn't exist", () => {
      const options = { fileName: "404.birk" };
      return Birk.compileFile(options).catch(e => {
        expect(e.message).toContain("ENOENT: no such file or directory");
      });
    });

    test("compiles if correct options provided", async () => {
      const baseDir = path.join(__dirname, "fixtures");
      const fileName = path.join(baseDir, "simple.birk");
      const options = { fileName, baseDir, includesDir: baseDir };
      const out = await Birk.compileFile(options);
      expect(out).toMatchObject({
        code: expect.any(String),
        fn: expect.any(Function),
        locals: expect.any(Set),
        warnings: expect.any(Array)
      });
    });
  });

  describe(".renderString", () => {
    test("defaults work well", () => {
      const input = "<div>Hello Birk</div>";
      const expected = "<div>Hello Birk</div>";
      const out = Birk.renderString(input);
      expect(out).toEqual(expected);
    });

    test("uses provided locals", () => {
      const input = "<div>Hello {{ name }}</div>";
      const expected = "<div>Hello Birk</div>";
      const out = Birk.renderString(input, { name: "Birk" });
      expect(out).toEqual(expected);
    });

    test("uses provided options", () => {
      const input = "<div>{{ msg | testFilter }}</div>";
      const expected = "<div>Hey!Hey!</div>";
      const options = {
        filters: {
          testFilter(s) {
            return s.repeat(2);
          }
        },
      };
      const out = Birk.renderString(input, { msg: "Hey!" }, options);
      expect(out).toEqual(expected);
    });
  });

  test(".renderStringAsync", async () => {
    const input = "<div>Hello Birk</div>";
    const expected = "<div>Hello Birk</div>";
    const out = await Birk.renderStringAsync(input);
    expect(out).toEqual(expected);
  });

  test(".renderFile", async () => {
    const baseDir = path.join(__dirname, "fixtures");
    const fileName = path.join(baseDir, "simple.birk");
    const options = { fileName, baseDir, includesDir: baseDir };
    const out = await Birk.renderFile({}, options);
    expect(out.trim()).toEqual("<div>Hello Birk</div>");
  });
});
