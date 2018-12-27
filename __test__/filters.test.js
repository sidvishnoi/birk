/** @type {import("..").renderString} */
const render = require("../build/node").renderString;

describe("Filters", () => {
  test("abs", () => {
    expect(render("{{ -1.5 | abs }}")).toEqual("1.5");
    expect(render("{{ 1.5 | abs }}")).toEqual("1.5");
    expect(render("{{ 'a' | abs }}")).toEqual("NaN");
    expect(render("{{ a | abs }}", { a: -1.5 })).toEqual("1.5");
  });

  test("append", () => {
    expect(render("{{ 'a' | append }}")).toEqual("a");
    expect(render("{{ 'a' | append: 'b' }}")).toEqual("ab");
    expect(render("{{ 'a' | append: 1 }}")).toEqual("a1");
    expect(render("{{ 1 | append: 1 }}")).toEqual("11");
  });

  test("capitalize", () => {
    expect(render("{{ 'abc' | capitalize }}")).toEqual("Abc");
    expect(render("{{ 'aBc' | capitalize }}")).toEqual("ABc");
  });

  test("ceil", () => {
    expect(render("{{ 1.1 | ceil }}")).toEqual("2");
    expect(render("{{ 1.9 | ceil }}")).toEqual("2");
  });

  test("concat", () => {
    expect(render("{{ [1, 2] | concat: 3 }}")).toEqual("1,2,3");
    expect(render("{{ [1, 2] | concat: [3] }}")).toEqual("1,2,3");
    expect(render("{{ [1, 2] | concat: [3, 4] }}")).toEqual("1,2,3,4");
  });

  test("divided_by", () => {
    expect(render("{{ 10 | divided_by: 2 }}")).toEqual("5");
    expect(render("{{ '10' | divided_by: 2 }}")).toEqual("5");
  });

  test("downcase", () => {
    expect(render("{{ 'aBc' | downcase }}")).toEqual("abc");
  });

  test("escape", () => {
    expect(render("{{ '<p>' | escape }}")).toEqual("&lt;p&gt;");
    expect(render("{{ 'a & b' | escape }}")).toEqual("a &amp; b");
    expect(render("{{ '&amp;' | escape }}")).toEqual("&amp;amp;");
  });

  test("escape_once", () => {
    expect(render("{{ '<p>' | escape_once }}")).toEqual("&lt;p&gt;");
    expect(render("{{ 'a & b' | escape_once }}")).toEqual("a &amp; b");
    expect(render("{{ '&amp;' | escape_once }}")).toEqual("&amp;");
  });

  test("first", () => {
    expect(render("{{ 'abc' | first }}")).toEqual("a");
    expect(render("{{ [1,2,3] | first }}")).toEqual("1");
    expect(render("{{ 'a' | first }}")).toEqual("a");
    expect(render("{{ '' | first }}")).toEqual("");
    expect(render("{{ 1 | first }}")).toEqual("1");
  });

  test("floor", () => {
    expect(render("{{ 1.1 | floor }}")).toEqual("1");
    expect(render("{{ 1.9 | floor }}")).toEqual("1");
  });

  test("ifnot", () => {
    expect(render("{{ who | ifnot: 'Who?' }}")).toEqual("Who?");
    expect(render("{{ 'me?' | ifnot: 'Who?' }}")).toEqual("me?");
    expect(render("{{ 0 | ifnot: 4 }}")).toEqual("4");
    expect(render("{{ 0 | ifnot }}")).toEqual("");
  });

  test("join", () => {
    expect(render("{{ [1,2,3] | join }}")).toEqual("123");
    expect(render("{{ [1,2,3] | join: '' }}")).toEqual("123");
    expect(render("{{ [1,2,3] | join: '.' }}")).toEqual("1.2.3");
    expect(render("{{ [1,2,3] | join: ', ' }}")).toEqual("1, 2, 3");
    expect(() => render("{{ 5 | join: ',' }}")).toThrow();
    expect(() => render("{{ 'a' | join: ',' }}")).toThrow();
  });

  test("key", () => {
    expect(render("{{ { k: 5 } | key: 'k' }}")).toEqual("5");
    expect(render("{{ { k: 5 } | key: 'l' }}")).toEqual("undefined");
  });

  test("last", () => {
    expect(render("{{ 'abc' | last }}")).toEqual("c");
    expect(render("{{ [1,2,3] | last }}")).toEqual("3");
    expect(render("{{ 'a' | last }}")).toEqual("a");
    expect(render("{{ '' | last }}")).toEqual("");
    expect(render("{{ 1 | last }}")).toEqual("1");
  });

  test("lstrip", () => {
    expect(render("{{ '  abc ' | lstrip }}")).toEqual("abc ");
    expect(render("{{ 'abc' | lstrip }}")).toEqual("abc");
  });

  test("map", () => {
    const fn = "{% js %}const double = x => x * 2;{% endjs %}";
    expect(render(fn + "{{ [1,2] | map: double }}")).toEqual("2,4");
  });

  test("minus", () => {
    expect(render("{{ 10 | minus: 2 }}")).toEqual("8");
    expect(render("{{ '10' | minus: 2 }}")).toEqual("8");
  });

  test("modulo", () => {
    expect(render("{{ 11 | modulo: 3 }}")).toEqual("2");
    expect(render("{{ 10 | modulo: 2 }}")).toEqual("0");
    expect(render("{{ '10' | modulo: 2 }}")).toEqual("0");
  });

  test("newline_to_br", () => {
    const locals = { str: "e\nf" };
    expect(render("{{ str | newline_to_br }}", locals)).toEqual("e<br/>f");
    expect(render("{{ 'e\nf' | newline_to_br }}")).toEqual("e<br/>f");
    expect(render("{{ 'ef' | newline_to_br }}")).toEqual("ef");
  });

  test("number", () => {
    expect(render("{{ '5' | number }}")).toEqual("5");
    expect(render("{{ 5 | number }}")).toEqual("5");
    expect(render("{{ 'a' | number }}")).toEqual("NaN");
    expect(render("{{ 'a' | number | ifnot }}")).toEqual("");
  });

  test("pick", () => {
    const locals = { items: [{ a: 5, b: "foo" }, { a: 10, b: "bar" }] };
    expect(render("{{ items | pick: 'a' }}", locals)).toEqual("5,10");
    expect(render("{{ items | pick: 'b' }}", locals)).toEqual("foo,bar");
    expect(render("{{ [{ k: 5 }] | pick: 'k' }}")).toEqual("5");
  });

  test("plus", () => {
    expect(render("{{ 10 | plus: 2 }}")).toEqual("12");
    expect(render("{{ '10' | plus: 2 }}")).toEqual("12");
  });

  test("prepend", () => {
    expect(render("{{ 'a' | prepend }}")).toEqual("a");
    expect(render("{{ 'a' | prepend: 'b' }}")).toEqual("ba");
    expect(render("{{ 'a' | prepend: 1 }}")).toEqual("1a");
    expect(render("{{ 1 | prepend: 2 }}")).toEqual("21");
  });

  test("remove", () => {
    expect(render("{{ 'abab' | remove }}")).toEqual("abab");
    expect(render("{{ 'ababc' | remove: 'a' }}")).toEqual("bbc");
    expect(render("{{ 'abaa' | remove: 'c' }}")).toEqual("abaa");
    expect(render("{{ 1010011 | remove: '1' }}")).toEqual("000");
    expect(render("{{ [1,2,3] | remove: 1 }}")).toEqual("2,3");
    expect(render("{{ [1,2,1,31,11] | remove: 1 }}")).toEqual("2,31,11");
  });

  test("remove_first", () => {
    expect(render("{{ 'ababc' | remove_first: 'a' }}")).toEqual("babc");
    expect(render("{{ 'abaa' | remove_first: 'c' }}")).toEqual("abaa");
    expect(render("{{ 1010011 | remove_first: '1' }}")).toEqual("010011");
    expect(render("{{ [1,2,3] | remove_first: 1 }}")).toEqual(",2,3");
    expect(render("{{ 'abab' | remove_first }}")).toEqual("abab");
  });

  test("repeat", () => {
    expect(render("{{ 'ab' | repeat: 2 }}")).toEqual("abab");
    expect(render("{{ 'ab' | repeat: '2' }}")).toEqual("abab");
    expect(render("{{ 'ab' | repeat }}")).toEqual("ab");
    expect(render("{{ 1 | repeat: 2 }}")).toEqual("11");
  });

  test("replace", () => {
    expect(render("{{ 'abab' | replace: 'a', 'b' }}")).toEqual("bbbb");
    expect(render("{{ 'ab\"ab' | replace: '\"', '\\'' }}")).toEqual("ab'ab");
    expect(render("{{ 'ab' | replace: 'b', 'ba' }}")).toEqual("aba");
    expect(render("{{ 'abab' | replace: 'a' }}")).toEqual("bb");
    expect(render("{{ 'abab' | replace: 'a', '' }}")).toEqual("bb");
    expect(render("{{ 'ab' | replace }}")).toEqual("ab");
  });

  test("replace_first", () => {
    expect(render("{{ 'abab' | replace_first: 'a', 'b' }}")).toEqual("bbab");
    expect(render("{{ 'abb' | replace_first: 'b', 'ba' }}")).toEqual("abab");
    expect(render("{{ 'abab' | replace_first: 'a' }}")).toEqual("bab");
    expect(render("{{ 'abab' | replace_first: 'a', '' }}")).toEqual("bab");
    expect(render("{{ 'ab' | replace_first }}")).toEqual("ab");
  });

  test("reverse", () => {
    expect(render("{{ [1,2,3] | reverse }}")).toEqual("3,2,1");
    expect(render("{{ 'abab' | reverse }}")).toEqual("baba");
    expect(render("{{ 123 | reverse }}")).toEqual("321");
  });

  test("round", () => {
    expect(render("{{ 1.4 | round }}")).toEqual("1");
    expect(render("{{ 1.6 | round }}")).toEqual("2");
    expect(render("{{ 1.68623 | round }}")).toEqual("2");
    expect(render("{{ 1.68623 | round: 1 }}")).toEqual("1.7");
    expect(render("{{ 1.68623 | round: 2 }}")).toEqual("1.69");
    expect(render("{{ 1.68623 | round: 3 }}")).toEqual("1.686");
    expect(render("{{ 1.68623 | round: 100 }}")).toEqual("1.68623");
    expect(render("{{ 1.68623 | round: -1 }}")).toEqual("0");
  });

  test("rstrip", () => {
    expect(render("{{ '  abc ' | rstrip }}")).toEqual("  abc");
    expect(render("{{ 'abc' | rstrip }}")).toEqual("abc");
  });

  test("size", () => {
    expect(render("{{ '123' | size }}")).toEqual("3");
    expect(render("{{ [1,2,3] | size }}")).toEqual("3");
    expect(render("{{ 500 | size }}")).toEqual("3");
  });

  test("slice", () => {
    expect(render("{{ '123' | slice }}")).toEqual("123");
    expect(render("{{ '123' | slice: 1 }}")).toEqual("23");
    expect(render("{{ '123' | slice: 1, 2 }}")).toEqual("2");
    expect(render("{{ '123' | slice: 1, 1 }}")).toEqual("");
    expect(render("{{ '123' | slice: 100, -1 }}")).toEqual("");
    expect(render("{{ '123' | slice: 1, -1 }}")).toEqual("2");
    expect(render("{{ '123' | slice: -1 }}")).toEqual("3");
    expect(render("{{ '123' | slice: 0, -1 }}")).toEqual("12");
    expect(render("{{ [1,2,3] | slice }}")).toEqual("1,2,3");
    expect(render("{{ [1,2,3] | slice: 1 }}")).toEqual("2,3");
    expect(render("{{ [1,2,3] | slice: 1, -1 }}")).toEqual("2");
    expect(render("{{ [1,2,3] | slice: -1 }}")).toEqual("3");
  });

  test("sort", () => {
    expect(render("{{ [3,2,1] | sort }}")).toEqual("1,2,3");
    expect(render("{{ [1,2,3] | sort }}")).toEqual("1,2,3");
    expect(render("{{ [10,3,2] | sort }}")).toEqual("10,2,3");
    expect(
      render("{{ ['apple', 'orange', 'banana', 'oranges'] | sort }}")
    ).toEqual("apple,banana,orange,oranges");
    const sortFn = "{% js %}const cmp = (a, b) => a - b;{% endjs %}";
    expect(render(sortFn + "{{ [10,3,2] | sort: cmp }}")).toEqual("2,3,10");
  });

  test("split", () => {
    expect(render("{{ 'aabc' | split | size }}")).toEqual("4");
    expect(render("{{ 'aabc' | split: 'a' | size }}")).toEqual("3");
    expect(render("{{ 'aabc' | split: 'aa' | size }}")).toEqual("2");
    expect(render("{{ 'aabc' | split: 'aabc' | size }}")).toEqual("2");
    expect(render("{{ 'aabc' | split: 'foo' | size }}")).toEqual("1");
  });

  test("stringify", () => {
    expect(render("{{ 123 | stringify }}")).toEqual("123");
    expect(render("{{ 'abc' | stringify }}")).toEqual("abc");
    expect(render("{{ [1,2,3] | stringify }}")).toEqual("1,2,3");
    expect(render("{{ {a: 5} | stringify }}")).toEqual("[object Object]");
  });

  test("strip", () => {
    expect(render("{{ '  abc ' | strip }}")).toEqual("abc");
    expect(render("{{ 'abc' | strip }}")).toEqual("abc");
  });

  test("strip_html", () => {
    expect(render("{{ '<p>abc</p>' | strip_html }}")).toEqual("abc");
    expect(render("{{ '<p>abc' | strip_html }}")).toEqual("abc");
    expect(render("{{ 'abc</p>' | strip_html }}")).toEqual("abc");
    expect(render("{{ '<style>body {}</style>' | strip_html }}")).toEqual("");
    expect(render("{{ '<script>alert()</script>' | strip_html }}")).toEqual("");
  });

  test("strip_newlines", () => {
    expect(render("{{ 'e\nf' | strip_newlines }}")).toEqual("ef");
    expect(render("{{ 'e\n\n\n\\\nf' | strip_newlines }}")).toEqual("e\\nf");
    expect(render("{{ 'ef' | strip_newlines }}")).toEqual("ef");
  });

  test("times", () => {
    expect(render("{{ 10 | times }}")).toEqual("10");
    expect(render("{{ 10 | times: 2 }}")).toEqual("20");
    expect(render("{{ '10' | times: 2 }}")).toEqual("20");
  });

  test("truncate", () => {
    expect(render("{{ 'abc' | truncate }}")).toEqual("abc");
    expect(render("{{ 'abcd efghi jklmno' | truncate }}")).toEqual(
      "abcd efghi jk..."
    );
    expect(render("{{ 'abc' | truncate: 10 }}")).toEqual("abc");
    expect(render("{{ 'abcd efghi' | truncate: 6 }}")).toEqual("abc...");
    expect(render("{{ 'abcd efghi' | truncate: 6, '..' }}")).toEqual("abcd..");
  });

  test("truncate_words", () => {
    expect(render("{{ 'abc def' | truncate_words }}")).toEqual("abc def");
    expect(
      render("{{ 'a b c d e f i j k l m n o p' | truncate_words }}")
    ).toEqual("a b c d e f i j k l...");
    expect(render("{{ 'ab cd' | truncate_words: 2 }}")).toEqual("ab cd");
    expect(render("{{ 'ab cd ef' | truncate_words: 2 }}")).toEqual("ab cd...");
    expect(render("{{ 'abcd efghi' | truncate_words: 1 }}")).toEqual("abcd...");
    expect(render("{{ 'a b c' | truncate_words: 2, '..' }}")).toEqual("a b..");
  });

  test("unescape", () => {
    expect(render("{{ '&lt;p&gt;' | unescape }}")).toEqual("<p>");
    expect(render("{{ 'a &amp; b' | unescape }}")).toEqual("a & b");
  });

  test("uniq", () => {
    expect(render("{{ [1,2,1,1,11] | uniq }}")).toEqual("1,2,11");
    expect(render("{{ [1,1,1] | uniq }}")).toEqual("1");
    expect(render("{{ ['aa', 'aa', 'ba'] | uniq }}")).toEqual("aa,ba");
    expect(render("{{ 'abcabe' | uniq }}")).toEqual("a,b,c,e");
    expect(render("{{ 'aaaa' | uniq }}")).toEqual("a");
  });

  test("upcase", () => {
    expect(render("{{ 'aBc' | upcase }}")).toEqual("ABC");
  });

  test("url_decode", () => {
    const url = "http://sidvishnoi.github.io/birk?foo=bar#baz";
    const encoded = encodeURIComponent(url);
    expect(render(`{{ "${encoded}" | url_decode }}`)).toEqual(url);
  });

  test("url_encode", () => {
    const url = "http://sidvishnoi.github.io/birk?foo=bar#baz";
    const encoded = encodeURIComponent(url);
    expect(render(`{{ "${url}" | url_encode }}`)).toEqual(encoded);
  });
});
