---
trigger: always_on
---

# Architectural Laws (Framework Agnostic)

## 1. Separation of Concerns (SoC)

- **Logic Isolation:** Business logic belongs in Services/Use-Cases (`lib/services/`).
- **Infrastructure Adapter:** External services (Appwrite, AWS) must be wrapped in generic interfaces.

## 2. State Management

- **Source of Truth:** Define where state lives. Do not duplicate state in two places.
- **Immutability:** Treat state as immutable.

## 3. Testing Mandate

- Every logic change requires a corresponding test update or addition in `vitest`.
