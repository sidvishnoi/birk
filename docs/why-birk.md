---
title: "Why Birk?"
url: /why-birk/
---

Birk is a modern template engine for JavaScript enviroment. Even though so many template engines are already available in the JavaScript ecosystem, Birk has its own purpose.

I built Birk while working on another side project (yet to be released) which had the following requirements on the template engine:
- to have an easy but powerful syntax, supporting includes/imports, template inheritance and mixins/macros.
- **must support template pre-compilation**.
- **to be light weight**,
- and be even lighter while executing after compilation.
- **to provide access to fine details like dependency tree of the template and names of locals used in the template.**
- to provide useful error handling in case of errors while allowing user to reduce the overheads of error handling when certain there are no errors.
- should be easy to migrate to/from.
- must be extensible.

So, I built Birk supporting the above as:
- Birk's syntax is hugely inspired by Liquid and Twig, making it really easy to migration.
- Birk's size is 20KB in NodeJs enviroment. If file-system specific tags are not required, there is also a 16KB lite version usable in browsers.
- Birk provides useful error details during the compilation and execution.
- We can disable debug related info to reduce the size of compiled template even further.
- Provides access to dependency tree of template (includes, extends etc.), along with a set of `locals` actually used in template.
- Birk's compiled templates can be used as an independent function with the runtime inlined. The runtime (with size of just 3KB) can be provided separately also.
- Birk can be easily extended with custom filters and tags.


## Why I didn't use existing template engines?

It's not that they're bad or something. They were just not supporting my requirements. For example:
- EJS doesn't support compile time includes anymore.
- Pug is too powerful hence heavy.
- Liquid didn't have strong template pre-compilation
- Nunjucks was difficult to extend, didn't provided template pre-compilation I needed.
- None of them provided fine details like dependency tree (except Pug, which provides list of dependencies, whereas I needed a tree).
- Many others didn't satisfy my requirements, so I decided to build my own!

Also, it was fun creating a template engine. Specially, the error source mapping part was a good learning experience.
