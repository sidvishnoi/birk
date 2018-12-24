const path = require("path");
const { readFile } = require("fs").promises;

const { preProcess } = require("./resolve-includes");
const { tokenize } = require("./tokenize");
const { generateCode } = require("./codegen");

// const input = [
// // `{% comment %}
// // const uppercase = s => s.toUpperCase();
// // const repeat = (s, count) => s.repeat(count);
// // const items = [{a: "a", b: 10}, {a: "b", b: 20}, {a: "c", b: 30}]; {% endcomment %}`,
// // `{% js %}
// // const increment = (num, inc) => num + inc;
// // {% endjs %}`,
// // `<ul>`,
// // `{% for {a, b} of items %}`,
// // `  <li>{{ a | uppercase | repeat: 2 }} ➡ {{ b | increment: 100 }}</li>`,
// // `  {% if user !== null %}`,
// // `    <p>Hello {{ user.name }}!</p>`,
// // `  {% elseif user !== undefined %}`,
// // `    <p>Hello useria!</p>`,
// // `  {% else %}`,
// // `    <p>Hello user!</p>`,
// // `  {% endif %}`,
// // `{% endfor %}`,
// // `</ul>`,
// // `{% js %}
// // `{% for key in object %}{% endfor %}
// // {% for item of items %}{% endfor %}
// // {% for [a, b] of items %}{% endfor %}
// // {% for {a, b} of items %}{% endfor %}
// // {% for key, value of object %}{% endfor %}`,
// // `{% for i of 5..10-4 %}
// //   <li>{{ i | increment: 10 }}</li>
// // {% endfor %}`,
// // `{% assign handle = 'cake' %}
// // {% case handle %}
// //   {% when 'cake' %}
// //      This is a cake
// //   {% when 'cookie' %}
// //      This is a cookie
// //   {% default %}
// //      This is not a cake nor a cookie
// // {% endcase %}`,
// // `{% for idx, item of array %}
// //   {% if idx < 5 %}{% continue %}{% endif %}
// //   do something
// //   {% if idx > 10 %}{% break %}{% endif %}
// // {% endfor %}`,
// // `{% for idx, item of array | offset 5 | limit 10 %}
// //   do something
// // {% endfor %}`,
// // function greet(who) {
// //   return \`Hello \${who}\`;
// // }
// // {% endjs %}`,
// // `{{ "me" | greet }}`,
// // `{% mixin greet id name %}`,
// // ` <h2 id="{{id}}">{{name}}</h2>`,
// // `{% endmixin %}`,
// // `<p>BYE</p>`,
// // `{% +greet "foo" "bar" %}`,
// // `{% capture name %}hello world{% endcapture %}
// // <p>HEY {{ name | uppercase }}</p>`,
// ].join("\n");

(async () => {
  const baseDir = process.cwd();
  const fileName = path.join(baseDir, "inputs", "a.birk");
  const includesDir = path.join(baseDir, "inputs", "_includes");
  const base = await readFile(fileName, "utf8");
  const options = { fileName, includesDir, baseDir };
  const processed = await preProcess(base, options);
  const tokens = tokenize(processed.text);
  const out = generateCode(tokens, {});
  console.log(out.code.split("\n"));
})();


// const tokens = tokenize(input);
// try {
//   const { code } = generateCode(tokens);
//   console.log(code);
// } catch (error) {
//   console.error(error.stack);
//   if (error.state) {
//     delete error.state.tokens;
//     console.error(error.state);
//   }
// }
