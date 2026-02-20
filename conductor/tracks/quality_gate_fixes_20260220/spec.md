# Specification: quality_gate_fixes_20260220

## Overview
This track addresses a comprehensive list of linter warnings, markdown formatting issues, TypeScript strictness violations, and global state leaks in tests. Additionally, it addresses a specific architectural violation where server-only code was transitively imported into client components. The scope encompasses the explicitly reported findings and extends to resolving similar issues project-wide via automated linters.

## Functional Requirements
- **Markdown Formatting:** Resolve MD047 (missing trailing newline), MD022 (blank lines around headings), and MD009 (trailing spaces) in all identified `.md` files (`conductor/archive/...`, `conductor/tracks/...`, `WORKFLOW.md`, etc.).
- **Spec Reconcilation:** Update `conductor/tracks/deploy_strategy_update_20260220/spec.md` to resolve the contradiction regarding `ci.yml` and `cron.yml` being out of scope, clarifying that CI linting/quality gating changes were part of the deployment infrastructure updates.
- **Track Metadata:** Update the status of the archived track (`centralize_env_config_20260220`) in its `metadata.json` from `new` to `archived`.
- **Test Isolation:**
  - Fix global state leaks in `lib/infrastructure/config/env.test.ts` by saving and restoring `process.env`, resetting modules (`vi.resetModules()`), and restoring all mocks/spies (`vi.restoreAllMocks()`) in `afterEach`.
  - Add explicit test defaults for `NEXT_PUBLIC_APP_URL` and `NODE_ENV` in `vitest.setup.ts`.
  - Explicitly mock the newly extracted `client-env.ts` module in the test setup.
- **TypeScript & Import Fixes:**
  - Move the duplicate `env` import in `lib/presentation/actions/auth.actions.ts` to the top import block.
  - Change the rest-parameter types for the logger methods in `lib/utils/logger.ts` from `(...args: any[])` to `(...args: unknown[])`.
- **Architecture Fix (Client/Server Separation):** Extract client-safe environment variables (`NEXT_PUBLIC_*`) from `lib/infrastructure/config/env.ts` into a new module `lib/infrastructure/config/client-env.ts`. This new module must NOT import "server-only". Update client code (like `appwrite.web.ts`) to use this new module to prevent transitive server-only violations.
- **Documentation Refinement:** Rephrase the bullet points in `WORKFLOW.md` (e.g., "Runs `npm run lint`") to read more naturally.

## Acceptance Criteria
- All explicitly reported markdown files end with a single newline and have appropriate spacing around headings.
- The `deploy_strategy_update_20260220` spec accurately reflects the changes made to CI/CD files.
- `env.test.ts` passes without leaking global state across tests.
- `vitest.setup.ts` correctly applies default environment variables and mocks `client-env.ts`.
- `auth.actions.ts` has a single, correctly placed import for `env`.
- `logger.ts` uses `unknown[]` instead of `any[]` and compiles without type errors.
- `client-env.ts` is successfully extracted, and client-side code imports it without triggering "server-only" module errors.
- A full project run of `npm run lint` and `npx tsc` passes without warnings or errors.
- The automated test suite (`npm run test`) passes successfully.

## Out of Scope
- Adding new product features or structural changes beyond the environment variable refactor and logging parameter updates.