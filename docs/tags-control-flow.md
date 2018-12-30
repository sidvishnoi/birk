---
title: Control Flow Tags
url: /docs/tags/control-flow-tags/
---

Control flow tags create conditions that decide whether blocks of Birk code get executed.

## `if`

Executes a block of code only if a certain condition is met (that is, if the result is `true`). `if` is a block tag, hence it must end with a matching `endif` tag.

``` birk
<!-- input.birk -->
{% if user.age > 10 %}
  <p>You're allowed to use this product.</p>
{% endif %}
```

``` html
<!-- output.html -->
<p>You're allowed to use this product.</p>
```

The condition can be any valid JavaScript expression.

``` birk
<!-- input.birk -->
{% if Math.random() > 0.1 && mySet.has(user.name) %}
  I'm the output if above condition is met.
{% endif %}
```

## `else / elsif`

Adds more conditions to an `if` block.

``` birk
<!-- input.birk -->
{% if x < 5 %}
  less than 5
{% elseif x > 50 %}
  more than 50
{% else %}
  between 5 and 50
{% endif %}
```
``` birk
<!-- output.html -->
<!-- when x = 55 -->
more than 50
<!-- when x = 30 -->
between 5 and 50
```

## `case / when`

Creates a switch statement to execute a particular block of code when a variable has a specified value. `case` initializes the switch statement, and `when` statements define the various conditions.

You can optionally add a `default` statement at the end of the `case` to provide code to execute if none of the conditions are met.

``` birk
<!-- input.birk -->
{% case fruit %}
  {% when 'Oranges' %}
    Oranges are $0.59 a pound.
  {% when 'Mangoes' %}
  {% when 'Papayas' %}
  {% when 'Apples' %}
    {{ fruit }} are $2.79 a pound.
  {% default %}
    Sorry, we are out of {{ fruit }}.
{% endcase %}
```
