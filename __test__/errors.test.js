/** @type {import("..")} */
const Birk = require("../build/node");

describe("Error Handling", () => {
  test("Malformed token", () => {
    const str1 = "{% trim }";
    expect(() => Birk.compileString(str1)).toThrow(/Malformed token/);

    const str2 = "{% if true }nope{% endif %}";
    expect(() => Birk.compileString(str2)).toThrow(/Malformed token/);
  });

  test("Invalid Tag", () => {
    const str1 = "{% lolno %}";
    expect(() => Birk.compileString(str1)).toThrow(/Tag "lolno" not found/i);

    const str2 = "{% lolno %}";
    const options = {
      tags: {
        lolno(state) {
          state.idx += 0; // didn't change state
        },
      },
    };
    expect(
      () => Birk.compileString(str2, options)
    ).toThrow(/Tag "lolno" didn't change engine state/i);

    const str3 = "{% for item : items %}{% endfor %}";
    expect(() => Birk.compileString(str3)).toThrow(/Invalid for loop/i);
  });

  test("Syntax Errors 😟", () => {
    // TODO: add more tests
    const str1 = "{% js %}let eww() = await;{% endjs %}";
    expect(() => Birk.compileString(str1)).toThrow(/SyntaxError/);
  });
});
