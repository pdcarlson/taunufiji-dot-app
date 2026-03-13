# JavaScript Style Guide

Based on the [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html).

## Source File Basics

- **File Naming**: All lowercase, with underscores (`_`) or dashes (`-`).
- **File Encoding**: UTF-8.
- **Whitespace**: Use only ASCII horizontal spaces. Tabs are forbidden for indentation.

## Formatting

- **Braces**: Required for all control structures, even single-line blocks. Use K&R style.
- **Indentation**: +2 spaces for each new block.
- **Semicolons**: Every statement must be terminated with a semicolon.
- **Column Limit**: 80 characters.
- **Line-wrapping**: Indent continuation lines at least +4 spaces.

## Language Features

- **Variable Declarations**: Use `const` by default, `let` if reassignment is needed. `var` is forbidden.
- **Array/Object Literals**: Use trailing commas. Do not use constructors.
- **Functions**: Prefer arrow functions for nested functions to preserve `this` context.
- **String Literals**: Use single quotes (`'`). Use template literals for multi-line strings or complex interpolation.
- **Control Structures**: Prefer `for-of` loops. `for-in` should only be used on dict-style objects.
- **Equality Checks**: Always use identity operators (`===` / `!==`).

## Naming

- **Classes**: `UpperCamelCase`
- **Methods & Functions**: `lowerCamelCase`
- **Constants**: `CONSTANT_CASE`
- **Non-constant fields & variables**: `lowerCamelCase`

## JSDoc

- JSDoc on all classes, fields, and methods.
- Use `@param`, `@return`, `@override`, `@deprecated`.
