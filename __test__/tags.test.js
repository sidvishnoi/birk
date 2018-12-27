/** @type {import("..").renderString} */
const { renderString: render } = require("../build/node");

describe("Tags", () => {
  test("assign", () => {
    const template =
      "{% assign foo = 5 %}{{ foo }}," +
      "{% assign foo += 10 %}{{ foo }}," +
      "{% assign bar = 10 %}{{ foo | plus: bar }}";
    expect(render(template)).toEqual("5,15,25");
  });

  test("capture", () => {
    const str1 = "{% capture foo %}500 + 100{% endcapture %}{{ foo }}";
    expect(render(str1)).toEqual("500 + 100");

    const str2 = str1 + ",{% capture foo %}200{% endcapture %}{{ foo }}";
    expect(render(str2)).toEqual("500 + 100,200");

    const str3 = "{% capture foo %}2{{ 'foo' }}\n3{% endcapture %}{{ foo }}";
    expect(render(str3)).toEqual("2{{ 'foo' }}\n3");

    const str4 = "{% capture foo %}{% if 5 > 4 %}{% endcapture %}{{ foo }}";
    expect(render(str4)).toEqual("{% if 5 > 4 %}");

    const str5 = "{% capture foo %}bar";
    expect(() => render(str5)).toThrow(/tag {% capture foo %} not closed/);
  });

  test("raw", () => {
    const str1 = "{% raw %}foo {{ bar }}{% endraw %}";
    expect(render(str1)).toEqual("foo {{ bar }}");

    const str2 = "{% raw %}{% if 5 > 4 %}{% endraw %}";
    expect(render(str2)).toEqual("{% if 5 > 4 %}");

    const str3 = "{% raw %}foo";
    expect(() => render(str3)).toThrow(/tag {% raw %} not closed/);
  });

  test("js", () => {
    const str1 = "{% js %}let foo = 4;{% endjs %}{{ foo | plus: 5 }}";
    expect(render(str1)).toEqual("9");

    const str2 = "{% js %}let foo = 5;{% if 5 > 4 %}{% endjs %}";
    expect(() => render(str2)).toThrow(/invalid nesting/i);

    const str3 = "{% js %}foo";
    expect(() => render(str3)).toThrow(/tag {% js %} not closed/);
  });

  test("comment", () => {
    const str1 = "{% comment %}foo {{ bar }}{% endcomment %}";
    expect(render(str1)).toEqual("");

    const str2 = "{% comment %}{% if 5 > 4 %}{% endcomment %}";
    expect(render(str2)).toEqual("");

    const str3 = "{% comment %}foo";
    expect(() => render(str3)).toThrow(/tag {% comment %} not closed/);
  });

  test("if", () => {
    const str1 = "{% if 5 < 3 %}foo{% endif %}";
    expect(render(str1)).toEqual("");

    const str2 = "{% if 5 > 3 %}foo{% endif %}";
    expect(render(str2)).toEqual("foo");

    const str4 = "{% if 5 >3%}foo{% endif %}";
    expect(render(str4)).toEqual("foo");

    const str5 = "{% if !(false) %}foo{% endif %}";
    expect(render(str5)).toEqual("foo");

    const str6 = "{% if [1,2,3].includes(2) %}foo{% endif %}";
    expect(render(str6)).toEqual("foo");

    const strBad1 = "{% if 5 > 3 %}";
    expect(() => render(strBad1)).toThrow(/tag {% if 5 > 3 %} not closed/);

    const strBad2 = "{% if 5 > 3 %}\n{% if 2 > 1 %}\n{% endif %}";
    expect(() => render(strBad2)).toThrow(/invalid nesting/i);
    expect(() => render(strBad2)).toThrow(/>> 1|/);
  });

  test("elseif", () => {
    const str1 = "{% if 5 < 3 %}foo{% elseif 2 > 1 %}bar{% endif %}";
    expect(render(str1)).toEqual("bar");

    const str2 = "{% if 3 < 4 %}foo{% elseif 2 > 1 %}bar{% endif %}";
    expect(render(str2)).toEqual("foo");

    const strBad1 = "{% if 5 < 3 %}foo{% elseif 2 > 1 %}bar";
    expect(() => render(strBad1)).toThrow(/tag {% if 5 < 3 %} not closed/);
  });

  test("else", () => {
    const str1 = "{% if 0 %}foo{% else %}bar{% endif %}";
    expect(render(str1)).toEqual("bar");

    const str2 = "{% if 0 %}foo{% elseif 0 %}bar{% else %}baz{% endif %}";
    expect(render(str2)).toEqual("baz");

    const str3 = "{% if 1 %}foo{% else %}bar{% endif %}";
    expect(render(str3)).toEqual("foo");
  });

  test("case-when-default", () => {
    const strNoBreak =
      "{% case s %}" +
      "{% when 'foo' %}foo" +
      "{% when 'bar' %}bar" +
      "{% default %}default" +
      "{% endcase %}";
    expect(render("{% assign s = 'foo' %}" + strNoBreak).trim()).toEqual(
      "foobardefault"
    );
    expect(render("{% assign s = 'bar' %}" + strNoBreak).trim()).toEqual(
      "bardefault"
    );
    expect(render("{% assign s = 'baz' %}" + strNoBreak).trim()).toEqual(
      "default"
    );

    const str1 =
      "{% case s %}" +
      "{% when 'foo' %}foo{% break %}" +
      "{% when 'bar' %}bar{% break %}" +
      "{% default %}default" +
      "{% endcase %}";
    expect(render("{% assign s = 'foo' %}" + str1).trim()).toEqual("foo");
    expect(render("{% assign s = 'bar' %}" + str1).trim()).toEqual("bar");
    expect(render("{% assign s = 'baz' %}" + str1).trim()).toEqual("default");

    const str2 =
      "{% case s %}" +
      "{% when 'foo' %}{% if 5 > 3 %}foo{% endif %}{% break %}" +
      "{% default %}default" +
      "{% endcase %}";
    expect(render("{% assign s = 'foo' %}" + str2).trim()).toEqual("foo");
    expect(render("{% assign s = 'bar' %}" + str2).trim()).toEqual("default");

    expect(() => render("{% case s %}{% endcase %}")).toThrow(
      /invalid nesting/i
    );
    expect(() => render("{% case s %}")).toThrow(/{% case s %} not closed/i);
    expect(() => render("{% when 5 %}")).toThrow(/{% when 5 %} not closed/i);
    expect(() => render("{% case s %}{% default %}foo{% endcase %}")).toThrow(
      /invalid nesting/i
    );
  });

  describe("for", () => {
    test("simple: for value in array", () => {
      const str1 = "{% for item in [10,20,30] %}{{ item }}{% endfor %}";
      expect(render(str1)).toEqual("102030");

      const str2 =
        "{% assign items = [10,20,30] %}\n" +
        "{% for item in items %}\n" +
        "{{ item }}{% endfor %}";
      expect(render(str2).replace(/\s/g, "")).toEqual("102030");

      const str3 =
        "{% assign obj = { a: 1, b: 2, c: 3 } %}\n" +
        "{% for item in Object.keys(obj) %}\n" +
        "{{ item }}{% endfor %}";
      expect(render(str3).replace(/\s/g, "")).toEqual("abc");

      const str4 =
        "{% assign obj = { a: 1, b: 2, c: 3 } %}\n" +
        "{% for item in Object.values(obj) %}\n" +
        "{{ item }}{% endfor %}";
      expect(render(str4).replace(/\s/g, "")).toEqual("123");

      const err1 = "{% for item in items %}{% endfor %}";
      expect(() => render(err1)).toThrow(/items is not iterable/i);

      const err2 = "{% for user.name in items %}{% endfor %}";
      expect(() => render(err2)).toThrow(/Invalid identifiers in for loop/i);
    });

    test("simple with range: for value in range", () => {
      const str1 = "{% for item in 2..5 %}{{ item }}{% endfor %}";
      expect(render(str1)).toEqual("2345");

      const str2 = "{% for item in -2..1 %}{{ item }}{% endfor %}";
      expect(render(str2)).toEqual("-2-101");

      const err1 = "{% for item in -2.1 %}{{ item }}{% endfor %}";
      expect(() => render(err1)).toThrow(/is not iterable/i);
    });

    test("array destructuring: for [el1, el2] in [[a, b], [a, b]]", () => {
      const array = JSON.stringify([[1, "a"], [2, "b"], [3, "c"]]);

      const str1 =
        `{% for [a, b] in ${array} %}\n` + "{{ a }}{{ b }}{% endfor %}";
      expect(render(str1).replace(/\s/g, "")).toEqual("1a2b3c");

      const str2 =
        `{% assign items = ${array} %}\n` +
        "{% for [a, b] in items %}\n" +
        "{{ a }}{{ b }}{% endfor %}";
      expect(render(str2).replace(/\s/g, "")).toEqual("1a2b3c");

      const str3 =
        `{% assign items = ${array} %}\n` +
        "{% for [item] in items %}\n" +
        "{{ item }}{% endfor %}";
      expect(render(str3).replace(/\s/g, "")).toEqual("123");

      const str4 =
        `{% assign items = ${array} %}\n` +
        "{% for [,item] in items %}\n" +
        "{{ item }}{% endfor %}";
      expect(render(str4).replace(/\s/g, "")).toEqual("abc");

      const err1 = "{% for [ in items %}{% endfor %}";
      expect(() => render(err1)).toThrow(/Invalid identifiers in for loop/i);

      const err2 = "{% for [user.name] in items %}{% endfor %}";
      expect(() => render(err2)).toThrow(/Invalid identifiers in for loop/i);
    });

    test("object destructing: for {a, b} in [{ a, b }, { a, b }]", () => {
      const array = JSON.stringify([
        { a: 1, b: "a" },
        { a: 2, b: "b" },
        { a: 3, b: "c" },
      ]);

      const str1 =
        `{% for {a, b} in ${array} %}\n` + "{{ a }}{{ b }}{% endfor %}";
      expect(render(str1).replace(/\s/g, "")).toEqual("1a2b3c");

      const str2 =
        `{% assign items = ${array} %}\n` +
        "{% for {a, b} in items %}\n" +
        "{{ a }}{{ b }}{% endfor %}";
      expect(render(str2).replace(/\s/g, "")).toEqual("1a2b3c");

      const str3 =
        `{% assign items = ${array} %}\n` +
        "{% for { a } in items %}\n" +
        "{{ a }}{% endfor %}";
      expect(render(str3).replace(/\s/g, "")).toEqual("123");

      const err1 = "{% for { in items %}{% endfor %}";
      expect(() => render(err1)).toThrow(/Invalid identifiers in for loop/i);

      const err2 = "{% for { a.b} in items %}{% endfor %}";
      expect(() => render(err2)).toThrow(/Invalid identifiers in for loop/i);
    });

    test("key-value: for key, value in iterable", () => {
      const str1 = "{% for i, v in [10,20] %}{{ i }}:{{ v }},{% endfor %}";
      expect(render(str1)).toEqual("0:10,1:20,");

      const str2 = "{% for k, v in {a: 2, b: 3} %}{{ k }}:{{ v }},{% endfor %}";
      expect(render(str2)).toEqual("a:2,b:3,");

      const str3 = "{% for i, v in items %}{{ i }}:{{ v }},{% endfor %}";
      expect(render(str3, { items: [2, 3] })).toEqual("0:2,1:3,");

      const str4 = "{% for i, v in 2..5 %}{{ i }}:{{ v }},{% endfor %}";
      expect(render(str4)).toEqual("0:2,1:3,2:4,3:5,");

      const forgive1 = "{% for i, in [10,20] %}{{ i }}:{{ v }},{% endfor %}";
      expect(render(forgive1)).toEqual("0:undefined,1:undefined,");
    });

    test("key-value with limit and offset", () => {
      const end = "{{ i }}:{{ v }},{% endfor %}";

      const lim1 = "{% for i, v in [10,20,30,40,50] | limit: 2 %}" + end;
      expect(render(lim1)).toEqual("0:10,1:20,2:30,");

      const lim2 = "{% for i, v in [10,20,30,40,50] | limit 0 %}" + end;
      expect(render(lim2)).toEqual("0:10,");

      const lim3 = "{% for i, v in [10,20,30] | limit 100 %}" + end;
      expect(render(lim3)).toEqual("0:10,1:20,2:30,");

      const lim4 = "{% for i, v in [10,20,30,40,50] | limit -1 %}" + end;
      expect(render(lim4)).toEqual("");

      const off1 = "{% for i, v in [10,20,30,40,50] | offset: 2 %}" + end;
      expect(render(off1)).toEqual("2:30,3:40,4:50,");

      const off2 = "{% for i, v in [10,20,30] | offset 10 %}" + end;
      expect(render(off2)).toEqual("");

      const off3 = "{% for i, v in [10,20,30] | offset 0 %}" + end;
      expect(render(off3)).toEqual("0:10,1:20,2:30,");

      const beg = "{% for i, v in [10,20,30,40,50]";
      const str1 = beg + "| offset 1 | limit 3 %}" + end;
      expect(render(str1)).toEqual("1:20,2:30,3:40,");

      const str2 = beg + "| limit 2 | offset 1 %}" + end;
      expect(render(str2)).toEqual("1:20,2:30,");

      const str3 = beg + "| offset 10 | limit 3 %}" + end;
      expect(render(str3)).toEqual("");
    });

    test("break, continue", () => {
      const beg = "{% for i in [10,20,30] %}";
      const end = "{% endfor %}";

      const b1 = beg + "{% break %}{{i}}" + end;
      expect(render(b1)).toEqual("");

      const b2 = beg + "{% if i == 20 %}{% break %}{% endif %}{{i}}" + end;
      expect(render(b2)).toEqual("10");

      const b3 = beg + "{% if i > 40 %}{% break %}{% endif %}{{i}}" + end;
      expect(render(b3)).toEqual("102030");

      const c1 = beg + "{% continue %}{{i}}" + end;
      expect(render(c1)).toEqual("");

      const c2 = beg + "{% if i == 20 %}{% continue %}{% endif %}{{i}}" + end;
      expect(render(c2)).toEqual("1030");

      const c3 = beg + "{% if i < 30 %}{% continue %}{% endif %}{{i}}" + end;
      expect(render(c3)).toEqual("30");
    });

    test("trim", () => {
      const str1 = `{% if  5 > 4 %}
        foo{% endif %}`;
      expect(render(str1)).toMatch(/^\s+foo$/);

      const str2 = `{% if  5 > 4 %}{% trim %}
        foo{% endif %}`;
      expect(render(str2)).toMatch(/^foo$/);
    });

    test("mixin", () => {
      const mixin1 = "{% mixin greet %}Hi!{% endmixin %}";
      expect(render(mixin1 + "{% +greet %}")).toEqual("Hi!");
      expect(render(mixin1 + "{% +greet 'Sid' %}")).toEqual("Hi!");

      const mixin2 = "{% mixin greet name %}Hi {{ name }}{% endmixin %}";
      expect(render(mixin2 + "{% +greet 'Sid' %}")).toEqual("Hi Sid");
      expect(render(mixin2 + "{% +greet 1234 %}")).toEqual("Hi 1234");
      expect(render(mixin2 + "{% +greet %}")).toEqual("Hi undefined");
      expect(render(mixin2 + "{% +greet 1 %} and {% +greet 2 %}")).toEqual(
        "Hi 1 and Hi 2"
      );

      const mixin3 = "{% mixin add a b %}{{ a | plus: b }}{% endmixin %}";
      expect(render(mixin3 + "{% +add 2 3 %}")).toEqual("5");
      expect(render(mixin3 + "{% +add 2 %}")).toEqual("NaN");
      expect(render(mixin3 + "{% +add %}")).toEqual("NaN");
    });
  });
});
