// @ts-check

/** @param {import("highlight.js")} hljs*/
module.exports = hljs => {
  const CLASSNAMES = {
    tagName: "keyword",
    variableName: "title",
    filterName: "name",
    forLoopArguments: "emphasis",
  };

  const FILTER_ARGUMENTS = end => ({
    contains: [
      {
        begin: /\s+/,
        endsParent: true,
      },
      {
        begin: /\:/,
        end,
        excludeBegin: true,
        subLanguage: "javascript",
        returnEnd: true,
      },
    ],
  });

  const FILTER_INNER = end => ({
    excludeBegin: true,
    contains: [
      {
        begin: /\|\s*/,
        end: /(\:)|\W/,
        className: CLASSNAMES.filterName,
        excludeBegin: true,
        returnEnd: true,
        starts: FILTER_ARGUMENTS(end),
      },
    ],
  });

  const CONTAINER = {
    TAG_JS: {
      className: "addition",
      start: /\{%\s*(js)/,
      returnBegin: true,
      starts: {
        begin: /./,
        endsParent: true,
        end: /{%\s*endjs\s*%}/,
        excludeBegin: true,
        className: "addition",
        subLanguage: "javascript",
        returnEnd: true,
        // starts: this.TAG_GENERIC,
      },
    },
    TAG_FOR: {
      className: CLASSNAMES.tagName,
      begin: /for\s/,
      returnEnd: true,
      starts: {
        className: CLASSNAMES.forLoopArguments,
        start: /\w+/,
        end: /\||(%})/,
        returnEnd: true,
        endsWithParent: true,
        starts: FILTER_INNER(/\||%}/),
      },
    },
    TAG_GENERIC: {
      className: CLASSNAMES.tagName,
      begin: /\w+/,
      starts: {
        subLanguage: "javascript",
        end: /%}/,
        returnEnd: true,
        endsWithParent: true,
        relevance: 0,
      },
    },
    VARIABLE: {
      className: CLASSNAMES.variableName,
      begin: /\w+/,
      end: /\||(}})/,
      subLanguage: "javascript",
      endsWithParent: true,
      returnEnd: true,
      starts: FILTER_INNER(/\||}}/),
    },
  };

  return {
    aliases: [],
    case_insensitive: false,
    subLanguage: ["xml", "javascript"],
    contains: [
      hljs.COMMENT(/\{%\s*comment\s*%\}/, /\{%\s*endcomment\s*%\}/),
      {
        begin: /\{%/,
        end: /%}/,
        className: "template-tag",
        contains: [CONTAINER.TAG_FOR, CONTAINER.TAG_GENERIC],
      },
      {
        begin: /\{\{/,
        end: /}}/,
        className: "template-variable",
        contains: [CONTAINER.VARIABLE],
      },
    ],
  };
};
