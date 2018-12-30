---
title: "Docs Home"
url: /docs/
---

This document describes the syntax and semantics of the template engine and will be most useful as reference to those creating Birk templates.

Birk is a templating engine. A template is simply a text file. Birk can generate any text-based format (HTML, XML etc.) where whitespace control is not a critical requirement. Birk template files have `.birk` extension, though it's not a requirement.

This website is of course, built using Birk.

Birk templates have three basic blocks apart from raw text: **tags**, **expressions** and **filters**. The syntax and features are inspired by Symphony's Twig and Shopify's Liquid.

There are two kinds of delimiters: `{% ... %}` and `{{ ... }}`. The first one is used to execute statements such as for-loops (a tag), the latter prints the result of an expression to the template.

## Expressions

Expressions print data. The data in expressions are passed as `locals` to the template. The data can also be defined in multiple ways in the template itself using tags.

``` birk
{{ user.name }}
<!-- Outputs: john  -->
```

## Filters

Filters are used to modify the output of Expressions. Some filters are built-in to the language, while others can be passed in `options` or defined in template itself. [Read More](filters/).

``` birk
{{ user.name | upcase }}
<!-- Output: JOHN  -->
```

## Tags

Tags make up the programming logic that tells templates what to do. Tags are defined at compile time. Many useful tags are built-in and others can be defined in `options`. [Read More](tags/).

``` birk
{% if user.name == 'john %}
  Hey John
{% endif %}
```
