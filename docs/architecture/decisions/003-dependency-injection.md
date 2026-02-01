# 003. Adoption of Constructor Injection

Date: 2024-02-01
Status: Accepted

## Context

The application relied on a Service Locator pattern (accessing a global `Container` object directly within functions/classes) to resolve dependencies like Repositories. This made unit testing difficult, as global state masked transitive dependencies and required complex mocking setups (`setContainer`/`resetContainer`).

## Decision

We have refactored the Service Layer (specifically `DutyService` and `PointsService`) to use **Constructor Injection**.

1.  **Services are Classes:** Services are now instantiated classes, not static object literals.
2.  **Dependencies in Constructor:** All required repositories/providers are passed via the constructor.
3.  **Container at Composition Root:** The `getContainer()` function is used ONLY at the entry points (Next.js Server Actions, API Handlers) to instantiate the services.
4.  **Tests use Mocks:** Unit tests instantiate the Service directly with mock dependencies, removing the need for a global container during logic testing.

## Consequences

**Positive:**

- **Testability:** Dependencies are explicit; tests are isolated and easier to write.
- **Clarity:** A service's requirements are visible in its method signature/constructor.
- **Coupling:** Reduced coupling to the global infrastructure layer.

**Negative:**

- **Boilerplate:** Requires instantiation in the container or factory.
- **Refactoring Cost:** Existing consumers (Actions) had to be updated to pull instances from the container.
