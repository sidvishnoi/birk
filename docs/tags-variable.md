---
title: Variable tags
url: /docs/tags/variable-tags/
---

You can use variable tags to create new Birk variables.

## `assign`

Creates a new named variable.

``` birk
<!-- input.birk -->
{% assign favorite_number = 8 %}
My favorite number is {{ favorite_number }}.
```
``` html
<!-- output.html -->
My favorite number is 8.
```

The content after `assign` keyword can be any valid javascript assignment expression. For example:

``` birk
<!-- input.birk -->
{% assign favorite_number = 7 %}
My old favorite number is {{ favorite_number }}.
{% assign favorite_number += 1 %}
My new favorite number is {{ favorite_number }}.
```
``` html
<!-- output.html -->
My old favorite number is 7.
My new favorite number is 8.
```

## `capture`

Captures the string inside of the opening and closing tags and assigns it to a variable. Variables that you create using `capture` are stored as strings. You can really create long string assignments using capture. Any Birk code within will not be executed.

``` birk
<!-- input.birk -->
{% capture code %}
Hey {% if age > 10 %}{{ _ }}{% endif %}
{% endcapture %}

{{ code }}
{{ code | replace: "_", "Sid" }}
```
``` html
<!-- output.html -->
Hey {% if age > 10 %}{{ _ }}{% endif %}
Hey {% if age > 10 %}{{ Sid }}{% endif %}
```
