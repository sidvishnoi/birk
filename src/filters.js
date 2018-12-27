const escape = str => str.replace(/&|<|>|"|'/g, m =>
  ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&#34;", "'": "&#39;"})[m]);

const unescape = str => str.replace(/&(amp|lt|gt|#34|#39);/g, m =>
  ({"&amp;": "&", "&lt;": "<", "&gt;": ">", "&#34;": "\"", "&#39;": "'"})[m]);

const escape_once = str => str
  .replace(/&(amp|lt|gt|#34|#39);/g, m =>
    ({"&amp;": "&", "&lt;": "<", "&gt;": ">", "&#34;": "\"", "&#39;": "'"})[m])
  .replace(/&|<|>|"|'/g, m =>
    ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&#34;", "'": "&#39;"})[m]);

const filters = {
  abs: v => Math.abs(v),
  append: (v, arg = "") => `${v}${arg}`,
  capitalize: str => str.charAt(0).toUpperCase() + str.slice(1),
  ceil: v => Math.ceil(v),
  concat: (v, arg) => v.concat(arg),
  divided_by: (v, arg) => Number(v) / Number(arg),
  downcase: v => v.toLowerCase(),
  escape,
  escape_once,
  first: v => v[0] || v,
  floor: v => Math.floor(v),
  ifnot: (v, arg = "") => v || arg,
  join: (v, arg = "") => v.join(arg),
  key: (o, arg) => o[arg],
  last: v => v[v.length - 1] || v,
  lstrip: v => v.trimStart(),
  map: (arr, fn) => arr.map(fn),
  minus: (v, arg) => Number(v) - Number(arg),
  modulo: (v, arg) => Number(v) % Number(arg),
  newline_to_br: v => v.replace(/\n/g, "<br/>"),
  number: v => Number(v),
  pick: (arr, arg) => arr.map(v => v[arg]),
  plus: (v, arg) => Number(v) + Number(arg),
  prepend: (v, arg = "") => `${arg}${v}`,
  remove: (v, arg = "") => Array.isArray(v)
    ? v.filter(i => i !== arg)
    : `${v}`.split(arg).join(""),
  remove_first: (v, l) => `${v}`.replace(l, ""),
  repeat: (v, times = 1) => `${v}`.repeat(Number(times)),
  replace: (v, p = "", r = "") => v.split(p).join(r),
  replace_first: (v, p = "", r = "") => v.replace(p, r),
  reverse: v => Array.isArray(v)
    ? v.reverse()
    : `${v}`.split("").reverse().join(""),
  round: (v, arg = 0) => Math.round(v * (10 ** arg), arg) / (10 ** arg),
  rstrip: str => str.trimEnd(),
  size: v => v.length || `${v}`.length,
  slice: (v, begin = 0, end = undefined) => v.slice(begin, end),
  sort: (v, fn) => v.sort(fn),
  split: (v, arg = "") => v.split(arg),
  stringify: obj => `${obj}`,
  strip: v => v.trim(),
  strip_html: v =>
    v.replace(/<script.*?<\/script>|<!--.*?-->|<style.*?<\/style>|<.*?>/g, ""),
  strip_newlines: v => v.replace(/\n/g, ""),
  times: (v, arg = 1) => v * arg,
  truncate: (v, l = 16, o = "...") =>
    v.length <= l ? v : v.substr(0, l - o.length) + o,
  truncate_words: (v, l = 10, o = "...") => {
    const arr = v.split(" ");
    let ret = arr.slice(0, l).join(" ");
    if (arr.length > l) ret += o;
    return ret;
  },
  unescape,
  uniq: arr => [...new Set(arr)],
  upcase: str => str.toUpperCase(),
  url_decode: x => x.split("+").map(decodeURIComponent).join(" "),
  url_encode: x => x.split(" ").map(encodeURIComponent).join("+"),
};

// set aliases
filters.truncatewords = filters.truncate_words;

export default filters;
