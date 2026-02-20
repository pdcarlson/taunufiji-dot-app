# Implementation Plan - CI/CD Hardening & Logic Security Audit

## Phase 1: CI/CD & Infrastructure Hardening
- [x] Task: Harden CI/CD Workflows
    - [x] Update `.github/workflows/ci.yml` to use `https://example.com` as fallback for `NEXT_PUBLIC_APPWRITE_ENDPOINT`.
    - [x] Update `deploy-prod.yml` to include `APPWRITE_API_KEY` in build step and unify project-id secret usage.
    - [x] Add `continue-on-error: true` to "Sync Discord Commands" in `deploy-staging.yml`.
- [x] Task: Dependency Management
    - [x] Add `tsx` to `devDependencies` in `package.json`.
    - [x] Run `npm install` to update lock file.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: PDF Redactor Logic Fixes
- [ ] Task: Write failing tests for PDF Coordinate Mapping
    - [ ] Create `components/features/library/upload/PdfRedactor.test.tsx`.
    - [ ] Define test cases for coordinate scaling and redaction alignment.
- [ ] Task: Fix PDF Rendering & Alignment
    - [ ] Remove `canvas` parameter from `page.render` in `PdfRedactor.tsx`.
    - [ ] Implement unscaled page coordinate storage for redaction boxes.
    - [ ] Update render and burn-in logic to apply dynamic scaling.
- [ ] Task: Verify PDF Fixes
    - [ ] Run `npm test` and confirm alignment across simulated zoom levels.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Environment Safety & Refactoring
- [ ] Task: Harden Environment Configuration
    - [ ] Refactor `lib/infrastructure/config/env.ts` to export `clientEnv`.
    - [ ] Implement tolerant re-parse logic using `schema.partial().safeParse(process.env)`.
- [ ] Task: Update Client Consumers
    - [ ] Update `lib/infrastructure/persistence/appwrite.web.ts` to use `clientEnv`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Metrics & Logging Improvements
- [ ] Task: Update NotifyExpiredJob Metrics
    - [ ] Introduce `skipped_unassigned` counter in `NotifyExpiredJob`.
    - [ ] Update metrics logic to distinguish between sent notifications and skipped tasks.
- [ ] Task: Improve Sync Logging
    - [ ] Update `scripts/sync-staging.ts` to capture and log the full error object in `createIndex` catch block.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
