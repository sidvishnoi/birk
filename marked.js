const marked = require("marked");
const hljs = require("highlight.js/lib/highlight");
hljs.registerLanguage("birk", require("./birk.highlight"));
hljs.registerLanguage("xml", require("highlight.js/lib/languages/xml"));
hljs.registerLanguage("css", require("highlight.js/lib/languages/css"));
hljs.registerLanguage(
  "javascript",
  require("highlight.js/lib/languages/javascript")
);

marked.Renderer.prototype.heading = function(text, level) {
  const escapedText = text
    .toLowerCase()
    .replace(/<script.*?<\/script>|<!--.*?-->|<style.*?<\/style>|<.*?>/g, "")
    .replace(/[^\w]+/g, "-");
  return `<h${level}><a name="${escapedText}" class="anchor" href="#${escapedText}"><span class="header-link"></span></a>${text}</h${level}>`;
};

marked.Renderer.prototype.code = function(code, infostring, escaped = true) {
  const fileInfoRe = /(?:<!--|\/\*|\/\/)\s*(\w+\.\w+)/;
  const lang = (infostring || "").match(/\S*/)[0];

  const lines = code.split("\n");
  let file;
  if (fileInfoRe.test(lines[0])) {
    file = code.match(fileInfoRe)[1];
    code = lines.slice(1).join("\n");
  }

  if (this.options.highlight) {
    const out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }


  if (!lang) {
    return `<pre><code>${escaped ? code : escape(code, true)}</code></pre>`;
  }

  const fileInfo = file ? `data-file="${file}"` : "";
  return `<pre ${fileInfo}><code class="${this.options.langPrefix}${escape(
    lang,
    true
  )}">${escaped ? code : escape(code, true)}</code></pre>\n`;
};

marked.setOptions({
  highlight: (code, lang) => hljs.highlight(lang, code).value,
});

module.exports = marked;
