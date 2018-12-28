/** @type {import("..").} */
const { renderString: render } = require("../build/");

describe("Basic rendering", () => {
  test("plain text", () => {
    const input = "<p>Hello Birk</p>";
    const expected = "<p>Hello Birk</p>";
    const out = render(input);
    expect(out).toEqual(expected);
  });

  describe("uses locals", () => {
    test("simple", () => {
      const input = "<p>{{ name }} is {{ age }} years old.</p>";
      const expected = "<p>Sid is 23 years old.</p>";
      const locals = {
        name: "Sid",
        age: 23,
      };
      const out = render(input, locals);
      expect(out).toEqual(expected);
    });

    test("object", () => {
      const input = "<p>Hello {{ user.name }}</p>";
      const expected = "<p>Hello Sid</p>";
      const locals = {
        user: {
          name: "Sid",
        },
      };
      const out = render(input, locals);
      expect(out).toEqual(expected);
    });
  });

  describe("filters", () => {
    test("single filter", () => {
      const input = "<p>Hello {{ 'birk' | upcase }}</p>";
      const expected = "<p>Hello BIRK</p>";
      const out = render(input);
      expect(out).toEqual(expected);
    });

    test("filter with arguments", () => {
      const input = "<p>Hello {{ 'birk' | replace: 'b', 'B' }}</p>";
      const expected = "<p>Hello Birk</p>";
      const out = render(input);
      expect(out).toEqual(expected);
    });

    test("sequence of filters", () => {
      const input = "<p>Hello {{ 'birk' | downcase | capitalize }}</p>";
      const expected = "<p>Hello Birk</p>";
      const out = render(input);
      expect(out).toEqual(expected);
    });
  });

  describe("tags", () => {
    test("simple tag", () => {
      const input = "<p>Hello{% if 2 > 3 %}{{ 'world' }}{% endif %}</p>";
      const expected = "<p>Hello</p>";
      const out = render(input);
      expect(out).toEqual(expected);
    });
  });
});
