---
title: Theme tags
url: /docs/tags/theme-tags/
---

Theme tags allow you to reuse blocks of Birk code by including snippets from other birk files, extending templates using inheritance and mixins. Theme tags are really powerful.

## `comment`

Allows you to leave un-rendered code inside a Birk template. Any text within the opening and closing `comment` blocks will not be output, and any Birk code within will not be executed.

``` birk
<!-- input.birk -->
{% comment %}
  The following line greets the user
{% endcomment %}
Hello {{ name }}!
```
``` html
<!-- output.html -->
Hello Sid Vishnoi!
```

Birk comments are different than HTML comments. Birk comments are not rendered in HTML output. For example, consider the following:

``` birk
<!-- input.birk -->
<!-- I'm a HTML comment -->
{% comment %}I'm a Birk comment{% endcomment %}
```
``` birk
<!-- output.html -->
<!-- I'm a HTML comment -->
```

## `extends`

The extends tag can be used to extend a template from another one.

Lets define a base template `base.birk`, which defines a simple HTML skeleton document:

``` birk
<!-- base.birk -->
<html>
  <head>
    {% block head %}
      <title>{{ title }} - My Webpage</title>
    {% endblock %}
    {% block styles %}
      <link rel="stylesheet" href="style.css" />
    {% endblock %}
  </head>
  <body>
    <header>
      {% block header %}
        header from parent.birk
      {% endblock %}
    </header>
    <article>
      {% block content %}
        no content provided
      {% endblock %}
    </article>
  </body>
</html>
```

In this example, the `block` tags define four blocks that child templates can fill in.

All the `block` tag does is to tell the template engine that a child template may override those portions of the template.

A child template might look like this:

``` birk
<!-- child.birk -->
{% extends "base.birk" %}
{% block styles %}
  <link rel="stylesheet" href="style-alternate.css" />
  <style type="text/css">
    .important { color: #336699; }
  </style>
{% endblock %}
{% block content %}
  <h1>Index</h1>
  <p class="important">
  Welcome on my awesome homepage.
  </p>
{% endblock %}
```

The above will provide following as rendered output (ignoring whitespace):

``` html
<!-- output.html -->
<html>
  <head>
    <title>Some title - My Webpage</title>
    <link rel="stylesheet" href="style-alternate.css" />
    <style type="text/css">
      .important { color: #336699; }
    </style>
  </head>
  <body>
    <header>
      header from parent.birk
    </header>
    <article>
      <h1>Index</h1>
      <p class="important">
      Welcome on my awesome homepage.
      </p>
    </article>
  </body>
</html>
```

## `include`

Inserts content of a file from the includes folder, specified by `options.includesDir`.

Assume the `includesDir` contains two files as:
``` css
/* style.css */
body { background: black }
```
``` birk
<!-- header.birk -->
<header>{{ title }}</header>
```

We can import or include these files in our template as:
``` birk
<!-- input.birk -->
{% assign title = "Birk" %}
<html>
  <head>
    <style>{% include "style.css" %}</style>
  </head>
  <body>
    {% include "header.birk" %}
  </body>
</html>
```
``` html
<!-- output.html -->
<html>
  <head>
    <style>body { background: black }</style>
  </head>
  <body>
    <header>Birk</header>
  </body>
</html>
```

## `js`

If you think the above tags are not powerful enough for your use, we give you the most powerful and most dangerous tag: `js`. It's dangerous to use unless you know what you're doing.

The `js` tag allows you to insert arbitrary JavaScript code in your templates. This allows you to write complex logic in JavaScript.

``` birk
<!-- input.birk -->
{% js %}
function asCelsius(fh) {
  return (fh - 32) * (5 / 9);
}
{% endjs %}
{{ asCelsius(108) | round }}
{{ 87 | asCelsius | round }}
```
``` birk
<!-- output.html -->
42
31
```

## `mixin`

Mixins are comparable with functions in regular programming languages. They are useful to put often used HTML idioms into reusable elements to not repeat yourself.
A mixin is declared in a `mixin .. endmixin` block. The first word after `mixin` keyword is the name of the mixin, followed space separated parameter names. To use a mixin, we call it with mixin name prefixed with a `+` and pass arguments in a space separated list.

``` birk
<!-- input.birk -->
{% mixin input name type %}
  <input name="{{ name }}" type="{{ type | ifnot: 'text' }}" />
{% endmixin %}

{% +input "name" "text" %}
{% +input "password" "password" %}
{% +input "phone" %}
```
``` birk
<!-- output.html -->
<input name="name" type="text" />
<input name="password" type="password" />
<input name="phone" type="text" />
```

## `raw`

Allows output of Birk code on a page without being parsed.

``` birk
<!-- input.birk -->
{% raw %}{{ name }}{% endraw %}
Hello {{ name }}!
```
``` birk
<!-- output.html -->
{{ name }}
Hello Sid Vishnoi!
```
