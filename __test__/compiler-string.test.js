/** @type {import("..")} */
const { compileString: compile } = require("../build/");

describe("compileString - extracts locals", () => {
  test("extracts locals from objects", () => {
    const locals = id => [...compile(`{{ ${id} }}`).locals][0];
    expect(locals("user")).toEqual("user");
    expect(locals("user.name")).toEqual("user");
    expect(locals("$user.name")).toEqual("$user");
    expect(locals("_user")).toEqual("_user");
    expect(locals("user[attr]")).toEqual("user");
    expect(locals("Object.keys(user)")).toEqual("user");
  });

  test("doesn't return non variables as locals", () => {
    const length = id => compile(`{{ ${id} }}`).locals.size;
    expect(length("'user'")).toEqual(0);
    expect(length("[1, 2, 3]")).toEqual(0);
    expect(length("{ a: 1 }")).toEqual(0);
  });

  test("doesn't return assignments as locals", () => {
    expect(compile("{% assign o = 5 %}{{ o }}").locals.size).toBe(0);
    expect(compile("{% assign o = 5 %}{{ o.name }}").locals.size).toBe(0);
    expect(
      compile("{% if true %}{% assign id = 5 %}{% endif %}{{ id }}").locals
    ).toEqual(new Set(["id"]));
  });

  test("extracts locals from loop iterables", () => {
    expect(
      compile("{% for item in items %}{% endfor %}").locals
    ).toEqual(new Set(["items"]));
    expect(compile(
      "{% for item in Object.keys(JSON.parse(items.list)) %}{% endfor %}"
    ).locals).toEqual(new Set(["items"]));
    expect(compile(
      "{% for item in Object.keys([1,2,3]) %}{% endfor %}"
    ).locals).toEqual(new Set([]));
  });

  test("extracts valid full names", () => {
    const locals = id => [...compile(`{{ ${id} }}`).localsFullNames][0];
    expect(locals("user")).toEqual("user");
    expect(locals("user.name")).toEqual("user.name");
    expect(locals("$user.name")).toEqual("$user.name");
    expect(locals("user[attr]")).toEqual("user[attr]");
    expect(locals("Object.keys(user.name)")).toEqual("user.name");
  });
});

describe("compileString - inlineRuntime", () => {
  test("can inline runtime if asked", () => {
    const options = { inlineRuntime: true, filters: {
      myfilter(str) {
        return str + str;
      }
    } };
    const out1 = compile("{{ whom | upcase | myfilter | unknown }}", options);
    expect(out1.code).toContain("const _r_");
    expect(out1.code).toContain("filters: {");
    expect(out1.warnings.length).toBe(1);
    expect(out1.warnings[0].message).toMatch(/filter "unknown"/i);

    const out2 = compile("{{ whom }}", options);
    expect(out2.code).toContain("const _r_");
    expect(out2.code).not.toContain("filters: {");
  });

  test("can prevent inline runtime if asked", () => {
    const options = { inlineRuntime: false };
    const out = compile("{{ whom }}", options);
    expect(out.code).not.toContain("const _r_");
  });
});

describe("compileString - compileDebug", () => {
  test("removes compiler error info", () => {
    const options = { compileDebug: false };
    const out = compile("{{ foo }}", options);
    const debugLine = out.code.split("\n").find(
      l => l.startsWith("_pos_ = ")
    );
    expect(debugLine).toBeUndefined();
  });

  test("keeps compiler error info", () => {
    const options = { compileDebug: true };
    const out = compile("{{ foo }}", options);
    const debugLine = out.code.split("\n").find(
      l => l.startsWith("_pos_ = ")
    );
    expect(debugLine).toBeDefined();
  });
});
