---
title: "Array Filters"
url: /docs/filters/array-filters/
---

Array filters change the output of arrays.


## `join`

Joins the elements of an array with the character passed as the parameter. The result is a single string.

``` birk
<!-- input.birk -->
{% assign tags = ["sale", "mens", "womens", "awesome"] %}
{{ tags | join: '; ' }}
```
``` html
<!-- output.html -->
sales; mens; womens; awesome
```

## `first`

Returns the first element of an array.

``` birk
<!-- input.birk -->
{{ tags | first }}
```
``` html
<!-- output.html -->
sale
```

## `last`

Returns the last element of an array.
``` birk
<!-- input.birk -->
{{ tags | last }}
```
``` html
<!-- output.html -->
awesome
```

## `concat`

Concatenates (combines) an array with another array. The resulting array contains all the elements of the original arrays.

``` birk
<!-- input.birk -->
{% assign fruits = ["apples, oranges, peaches, tomatoes"] %}
{% assign vegetables = ["broccoli, carrots, lettuce, tomatoes"] %}
{{ plants | concat: vegetables | join: ", " }}
```
``` html
<!-- output.html -->
apples, oranges, peaches, tomatoes, broccoli, carrots, lettuce, tomatoes
```

## `map`

Maps an array to some other values using a mapping function. The mapping function must be provided as `locals` or defined using [`{% js %}`](../../tags/theme-tags#js) tag or [`{% assign %}`](../../tags/variable-tags#assign) tag.

``` birk
<!-- input.birk -->
{% assign square = x => x ** 2 %}
{% assign numbers = [1, 2, 3, 4] %}
{{ numbers | map: square | join: ", " }}
```
``` html
<!-- output.html -->
1, 4, 9, 16
```

## `reverse`

Reverses the order of the items in an array.

``` birk
<!-- input.birk -->
{% assign numbers = [1, 2, 3, 4] %}
{{ numbers | reverse | join: "." }}
```
``` html
<!-- output.html -->
4.3.2.1
```

## `size`

Returns the size of an array (the number of elements).

``` birk
<!-- input.birk -->
{{ [1,2,3] | size }}
```
``` html
<!-- output.html -->
3
```

## `slice`

Slices an array from an index `begin` (default zero) to index `end` (defaults to `undefined` i.e. end of array).

``` birk
<!-- input.birk -->
{{ [1,2,3] | slice: 1 }}
{{ [1,2,3] | slice: 0, -1 }}
{{ [1,2,3] | slice: -1 }}
```
``` html
<!-- output.html -->
2,3
1,2
3
```

## `sort`

Sorts the elements of an array using a given function. If no function is provided, the elements are sorted in string lexicographic order.

``` birk
<!-- input.birk -->
{% assign items = ["a", "c", "d", "b"] %}
{% assign numbers = [3, 1, 4, 10] %}
{% assign customSorter = (a, b) => a - b %}

{{ items | sort  }}
{{ numbers | sort  }}
{{ numbers | sort: customSorter  }}
```
``` html
<!-- output.html -->
a,b,c,d
1,10,3,4
1,3,4,10
```

## `uniq`

Removes any duplicate instances of elements in an array.

``` birk
<!-- input.birk -->
{{ [1,2,1,1,11] | uniq }}
{{ [1,1,1] | uniq }}
```
``` html
<!-- output.html -->
1,2,11
1
```
