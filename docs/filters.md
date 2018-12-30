---
title: "Filters"
url: /docs/filters/
---

Filters are simple methods that modify the output of numbers, strings, variables and objects. They are placed within an output tag `{{` `}}` and are denoted by a pipe character `|`.

``` birk
<!-- input.birk -->
<!-- fruit = "banana" -->
{{ fruit | upcase }}
```

``` html
<!-- output.html -->
BANANA
```

In the example above, `fruit` is the variable and `upcase` is the filter being applied.

Some filters require one or more parameters to be passed. The parameter values are written as a comma separated list, after the filter name appended with a colon (`:`).

``` birk
<!-- input.birk -->
{{ fruit | replace: "a", "*" }}
```
``` html
<!-- output.html -->
b*n*n*
```

Multiple filters can be used on one output. They are applied from left to right.

``` birk
<!-- input.birk -->
{% assign num = 7 %}
{{ num | plus: 2 | times: 3 }}
{{ num | times: 3 | plus: 2  }}
```
``` html
<!-- output.html -->
27
23
```

## Built-in Filters

- [Array filters](array-filters): Array filters change the output of arrays.
