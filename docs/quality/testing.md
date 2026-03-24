# Testing

> **Parent specs:** [Architecture](../../spec/architecture.md) · [Tech Stack](../../spec/tech-stack.md)

## Framework

- **Unit & Integration**: [Vitest](https://vitest.dev/) with jsdom environment
- **E2E Smoke**: [Playwright](https://playwright.dev/) with Chromium
- **Configuration**: `vitest.config.ts`, `vitest.setup.ts`
- **E2E Configuration**: `playwright.config.ts`, `tests/e2e/`

## Conventions

- **Co-location**: Test files live next to source files (e.g., `duty.service.test.ts` beside `duty.service.ts`).
- **Mocking**: `vitest.setup.ts` provides mock env vars and mocks `server-only`. Tests run without external services.
- **Pattern**: Mock infrastructure via domain ports/interfaces. Use constructor injection to pass mocks — never import concrete infrastructure classes in tests.
- **Non-interactive run**: `npm run test -- --run`

## Coverage

- **Tooling**: `@vitest/coverage-v8`
- **Critical module gate**: `npm run test:coverage:critical` — enforces ≥90% on lines, statements, and functions and ≥80% on branches for critical modules (see `vitest.critical.config.ts`)
- **General coverage**: `npm run test:coverage` — generates a coverage report for all modules
- **Target**: >80% for new code. All new services and domain logic must have corresponding test files.

## E2E Smoke Tests

Playwright smoke tests validate deployment-critical routes and auth redirects:

- **Location**: `tests/e2e/smoke.spec.ts`
- **Run**: `npm run test:e2e`
- **CI**: The `e2e-smoke` job in `ci.yml` installs Chromium and runs the suite

## Staging Diagnostics

Runtime dependency verification for staging environments:

```bash
npm run diagnose:staging
```

Validates Appwrite DB connectivity, Discord guild/channel/role reachability. See [Troubleshooting](../deployment/troubleshooting.md) for failure interpretation.

## CI Integration

All testing runs as part of the CI quality gates. See [CI Quality Gates](../deployment/ci.md) for the full job list and required status checks.
