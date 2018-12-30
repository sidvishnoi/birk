---
title: Iteration tags
url: /docs/tags/iteration-tags/
---

Iteration tags repeatedly run blocks of code. Birk supports 4 kinds of 4 `for` loops. They're essentially `for .. of` loops in JavaScript, hence we must be iterate over an [iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols). A special iterable called [`range`](#range) is also available.

## `for value in iterable`

Iterate over values an iterable.

``` birk
<!-- input.birk -->
{% for value in [10, 20, 30] %}
  {{ value }}
{% endfor %}
```
``` html
<!-- output.html -->
10
20
30
```

### `range`

Defines a range of numbers to loop through. You can define the range using both literal and variable values.

``` birk
<!-- input.birk -->
{% for i in 3..5 %}{{ i }} {% endfor %}
```
``` html
<!-- output.html -->
3 4 5
```

The range needs numbers as arguments. The numbers need not to be numeric literals.

``` birk
<!-- input.birk -->
{% assign my_limit = 3 %}
{% for i in -1..my_limit %}{{ i }} {% endfor %}
```
``` html
<!-- output.html -->
-1 0 1 2 3
```

## `for index, value in iterable`

Iterate over values an iterable, giving access to both the index of an item and the item itself.

``` birk
<!-- input.birk -->
{% for index, value in [10, 20, 30] %}
  {{ index }}:{{ value }}
{% endfor %}
```
``` html
<!-- output.html -->
0:10
1:20
2:30
```


This `for` loops is a special for loop. It supports two special parameters or filters.

### `limit`

Exits the for loop at a specific index.

``` birk
<!-- input.birk -->
<!-- assume: numbers = [10,20,30,40,50] -->
<!-- it's equivalent to executing block if i <= 2 -->
{% for i, num in numbers | limit: 2 %}
  {{ i }}: {{ num }}
{% endfor %}
```
``` html
<!-- output.html -->
0: 10
1: 20
2: 30
```

### `offset`

Starts the for loop at a specific index.

``` birk
<!-- input.birk -->
<!-- assume: numbers = [10,20,30,40,50] -->
<!-- it's equivalent to executing block if i >= 2 -->
{% for i, num in numbers | offset: 2 %}
  {{ i }}: {{ num }}
{% endfor %}
```
``` html
<!-- output.html -->
2: 30
3: 40
4: 50
```
You can use this loop to iterate over an object and access both its keys and values by using JavaScript's `Object.entries` function as:

``` birk
<!-- input.birk -->
{% for key, value in Object.entries(user) %}
  {{ key }}: {{ value }}
{% endfor %}
```
``` html
<!-- output.html -->
name: sid
age: 23
is_student: true
```

## `for` with destructuring

`for` loop also supports object and array destructuring. This provides an easy to use way to access attributes in an array of objects/arrays without refering to their key/index. The following examples make it clearer.

Using destructuring on array of objects:
``` birk
<!-- input.birk -->
{% comment %} items = [
  { id: 95, name: "Apple", price: 10 },
  { id: 9, name: "Orange", price: 15 },
  { id: 4, name: "Banana", price: 5 },
] {% endcomment %}
{% for { name, price } in items %}
  {{ name }} costs ${{ price }}.
{% endfor %}

```
``` html
<!-- output.html -->
Apple costs $10.
Orange costs $15.
Banana costs $5.
```

You can use destructuring on array of arrays also.

``` birk
<!-- input.birk -->
{% comment %} items = [
  [95, "Apple", 10],
  [9, "Orange", 15],
  [4, "Banana", 5],
] {% endcomment %}
{% for [name, price] in items %}
  {{ name }} costs ${{ price }}.
{% endfor %}
```
``` html
<!-- output.html -->
Apple costs $10.
Orange costs $15.
Banana costs $5.
```

Without this destructing you would write those loops as:

``` birk
<!-- first loop -->
{% for item in items %}
  {{ item.name }} costs ${{ item.price }}.
{% endfor %}

<!-- second loop -->
{% for item in items %}
  {{ item[1] }} costs ${{ item[2] }}.
{% endfor %}
```

## `break`

`break` allows you to break out of a loop. You generally use break along with some `if` block.

``` birk
<!-- input.birk -->
{% for num in [10,20,30,40] %}
  {% if num > 20 %}{% break %}{% endif %}
  {{ num }}
{% endfor %}

```
``` html
<!-- output.html -->
10
20
```

## `continue`

`continue` allows you to skip an iteration of a loop. You generally use continue along with some `if` block.

``` birk
<!-- input.birk -->
{% for num in [10,20,30,40] %}
  {% if num > 10 && num < 40 %}{% continue %}{% endif %}
  {{ num }}
{% endfor %}

```
``` html
<!-- output.html -->
20
30
```
