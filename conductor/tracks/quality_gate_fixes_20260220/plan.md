# Implementation Plan: quality_gate_fixes_20260220

## Phase 1: Documentation & Metadata Updates
- [ ] Task: Fix markdown formatting issues in tracked files
    - [ ] Resolve MD047, MD022, MD009 in `conductor/archive/centralize_env_config_20260220/index.md`, `metadata.json`, `plan.md`, `spec.md`
    - [ ] Add trailing newline to `conductor/tracks.md`
    - [ ] Fix markdown issues in `conductor/tracks/deploy_strategy_update_20260220/index.md`, `plan.md`, `spec.md`
    - [ ] Resolve trailing spaces and EOF newlines in `WORKFLOW.md`
- [ ] Task: Update Track Specs and Metadata
    - [ ] Reconcile Out of Scope contradiction in `deploy_strategy_update_20260220/spec.md`
    - [ ] Update `centralize_env_config_20260220` status to `archived` in `metadata.json`
    - [ ] Rephrase `WORKFLOW.md` repeating action verbs for clarity
- [ ] Task: Conductor - User Manual Verification 'Documentation & Metadata Updates' (Protocol in workflow.md)

## Phase 2: Architecture Refactoring & Test Isolation
- [ ] Task: Extract Client Environment Module
    - [ ] Create `lib/infrastructure/config/client-env.ts` exporting only `NEXT_PUBLIC_*` variables
    - [ ] Update `lib/infrastructure/config/env.ts` to stop exporting `clientEnv`
    - [ ] Refactor client code (`appwrite.web.ts`) to import from `client-env.ts`
- [ ] Task: Update Tests and Setup for Environment Isolation
    - [ ] Explicitly mock `client-env.ts` in `vitest.setup.ts`
    - [ ] Add explicit default test variables (`NEXT_PUBLIC_APP_URL`, `NODE_ENV`) to `vitest.setup.ts`
    - [ ] Fix global state leaks in `lib/infrastructure/config/env.test.ts` (using `originalEnv`, `vi.resetModules`, `mockRestore`)
- [ ] Task: Conductor - User Manual Verification 'Architecture Refactoring & Test Isolation' (Protocol in workflow.md)

## Phase 3: Code Quality & Typing Enforcement
- [ ] Task: Fix TypeScript and Import Groupings
    - [ ] Consolidate `env` import to the top of `lib/presentation/actions/auth.actions.ts`
    - [ ] Update `lib/utils/logger.ts` rest-parameters from `(...args: any[])` to `(...args: unknown[])`
- [ ] Task: Verify Project-Wide Quality Gates (Expanded Scope)
    - [ ] Run and fix any remaining errors from `npm run lint`
    - [ ] Run and fix any remaining errors from `npx tsc`
- [ ] Task: Conductor - User Manual Verification 'Code Quality & Typing Enforcement' (Protocol in workflow.md)