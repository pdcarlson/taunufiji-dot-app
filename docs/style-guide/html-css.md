# HTML/CSS Style Guide

Based on the [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html).

## General Rules

- **Protocol**: Use HTTPS for all embedded resources.
- **Indentation**: Indent by 2 spaces. Do not use tabs.
- **Capitalization**: Use only lowercase for all code.
- **Trailing Whitespace**: Remove all trailing whitespace.
- **Encoding**: UTF-8 with `<meta charset="utf-8">`.

## HTML

- **Semantics**: Use HTML elements according to their intended purpose.
- **Multimedia Fallback**: Provide `alt` text for images and transcripts/captions for media.
- **Separation of Concerns**: Strictly separate structure (HTML), presentation (CSS), and behavior (JavaScript).
- **Quotation Marks**: Use double quotation marks for attribute values.

## CSS

- **Class Naming**: Use meaningful, generic names. Separate words with a hyphen (`-`).
- **ID Selectors**: Avoid using ID selectors for styling. Prefer class selectors.
- **Shorthand Properties**: Use shorthand properties where possible.
- **`!important`**: Avoid using `!important`.
- **Declaration Order**: Alphabetize declarations within a rule.
- **Semicolons**: Use a semicolon after every declaration.

**Note**: This project uses Tailwind CSS for styling. These rules apply primarily to any custom CSS or component-level styles.
