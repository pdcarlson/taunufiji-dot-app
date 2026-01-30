---
trigger: always_on
---

# Implementation Standards: The Anti-Shortcut Laws

## 1. Completeness & Rigor

- **No Placeholders:** Comments like `// ... rest of code` are STRICTLY FORBIDDEN.
- **No Mocking in Prod:** Do not hardcode "test data" in production files unless explicitly requested for a mock mode.

## 2. Defensive Coding

- **Input Validation:** Every public function must validate its inputs (e.g., Zod schemas).
- **Error Handling:** Never swallow errors. Use typed error handling.
  - _Bad:_ `catch (e) { console.log(e) }`
  - _Good:_ `catch (error) { logger.error("Context", { error }); throw new AppError(...); }`

## 3. Architecture Alignment

- **Layered Segregation:** Business logic belongs in Services/Use-Cases, not Components.
- **Unidirectional Flow:** Data flows down; events flow up.
