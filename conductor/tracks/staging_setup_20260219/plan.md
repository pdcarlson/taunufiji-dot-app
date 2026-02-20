# Implementation Plan: Staging Setup & Audit

## Phase 1: Environment & Dependency Audit

- [x] **Task: Audit `env.ts` and Infrastructure Config**
  - [x] Read all existing configuration files in `lib/infrastructure/config/`.
  - [x] Cross-reference `env.ts` with the needs of `deploy-staging.yml`.
  - [x] **Write Tests**: Verify that `env.ts` fails gracefully when required keys are missing.
  - [x] **Implement**: Update `env.ts` to support optional/required splits for different environments.
- [x] **Task: Analyze Code Rabbit / PR Feedback**
  - [x] Review the `feat/staging-env` branch for known errors or warnings.
  - [x] Fix identified architectural or syntax errors in the presentation and application layers.
- [x] **Task: Eliminate Hardcoded Discord IDs**
  - [x] Update `env.ts` to include all role and channel IDs.
  - [x] Refactor `roles.ts` and services to use `env.ts` exclusively.
  - [x] **Write Tests**: Verify that role resolution works correctly with environment overrides.
- [ ] **Task: Conductor - User Manual Verification 'Phase 1: Audit' (Protocol in workflow.md)**

## Phase 2: Infrastructure Hardening & Cleanup

- [x] **Task: Resolve Linting & Type Warnings**
  - [x] Run `npm run lint` and fix the 100+ warnings (primarily unused imports and `any` types).
  - [x] Ensure all components using `env.ts` are using the new validated pattern.
- [x] **Task: Document Environment Setup**
  - [x] Create `ENV.md` detailing the Discord Application, Bot Intents, and Appwrite requirements.
- [x] **Task: Validate `deploy-staging.yml`**
  - [x] Ensure the workflow triggers on the correct branches.
  - [x] Implement: Adjust `deploy-staging.yml` to ensure all necessary `NEXT_PUBLIC_*` vars are passed to the build.
- [x] **Task: Finalize Clean Architecture Boundaries**
  - [x] Ensure no infrastructure-specific variables are leaking into the `lib/domain` layer.
- [ ] **Task: Conductor - User Manual Verification 'Phase 2: Hardening' (Protocol in workflow.md)**

## Phase 3: Final Deployment Check

- [ ] **Task: Run Quality Gates Locally**
  - [ ] Execute `npm run lint`, `npx tsc --noEmit`, and `npm test`.
  - [ ] Fix any regressions.
- [ ] **Task: Conductor - User Manual Verification 'Phase 3: Final Check' (Protocol in workflow.md)**
