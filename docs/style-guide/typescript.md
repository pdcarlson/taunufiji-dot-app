# TypeScript Style Guide

Based on the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html), enforced by `gts`.

## Language Features

- **Variable Declarations**: Always use `const` or `let`. `var` is forbidden. Use `const` by default.
- **Modules**: Use ES6 modules (`import`/`export`). Do not use `namespace`.
- **Exports**: Use named exports (`export { MyClass }`). Do not use default exports.
- **Classes**:
  - Do not use `#private` fields. Use TypeScript's `private` visibility modifier.
  - Mark properties never reassigned outside the constructor with `readonly`.
  - Never use the `public` modifier (it's the default). Restrict visibility with `private` or `protected` where possible.
- **Functions**: Prefer function declarations for named functions. Use arrow functions for anonymous functions/callbacks.
- **String Literals**: Use single quotes (`'`). Use template literals for interpolation and multi-line strings.
- **Equality Checks**: Always use triple equals (`===`) and not equals (`!==`).
- **Type Assertions**: Avoid type assertions (`x as SomeType`) and non-nullability assertions (`y!`). Provide clear justification if used.

## Disallowed Features

- **`any` Type**: Avoid `any`. Prefer `unknown` or a more specific type.
- **Wrapper Objects**: Do not instantiate `String`, `Boolean`, or `Number` wrapper classes.
- **Automatic Semicolon Insertion**: Do not rely on it. Explicitly end all statements with a semicolon.
- **`const enum`**: Do not use `const enum`. Use plain `enum` instead.
- **`eval()` and `Function(...string)`**: Forbidden.

## Naming

- **`UpperCamelCase`**: Classes, interfaces, types, enums, and decorators.
- **`lowerCamelCase`**: Variables, parameters, functions, methods, and properties.
- **`CONSTANT_CASE`**: Global constant values, including enum values.
- **`_` prefix/suffix**: Do not use `_` as a prefix or suffix for identifiers.

## Type System

- **Type Inference**: Rely on type inference for simple, obvious types. Be explicit for complex types.
- **`undefined` and `null`**: Both are supported. Be consistent.
- **Optional vs. `|undefined`**: Prefer optional parameters and fields (`?`) over adding `|undefined`.
- **`Array<T>` Type**: Use `T[]` for simple types. Use `Array<T>` for complex union types.
- **`{}` Type**: Do not use `{}`. Prefer `unknown`, `Record<string, unknown>`, or `object`.

## Comments and Documentation

- Use `/** JSDoc */` for documentation, `//` for implementation comments.
- Do not declare types in `@param` or `@return` blocks (redundant in TypeScript).
- Comments must add information, not just restate the code.
