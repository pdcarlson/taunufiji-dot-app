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
- [x] Task: Write failing tests for PDF Coordinate Mapping
    - [x] Create `components/features/library/upload/PdfRedactor.test.tsx`.
    - [x] Define test cases for coordinate scaling and redaction alignment.
- [x] Task: Fix PDF Rendering & Alignment
    - [x] Remove `canvas` parameter from `page.render` in `PdfRedactor.tsx`.
    - [x] Implement unscaled page coordinate storage for redaction boxes.
    - [x] Update render and burn-in logic to apply dynamic scaling.
- [x] Task: Verify PDF Fixes
    - [x] Run `npm test` and confirm alignment across simulated zoom levels.
- [x] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Environment Safety & Refactoring
- [x] Task: Harden Environment Configuration
    - [x] Refactor `lib/infrastructure/config/env.ts` to export `clientEnv`.
    - [x] Implement tolerant re-parse logic using `schema.partial().safeParse(process.env)`.
- [x] Task: Update Client Consumers
    - [x] Update `lib/infrastructure/persistence/appwrite.web.ts` to use `clientEnv`.
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Metrics & Logging Improvements
- [x] Task: Update NotifyExpiredJob Metrics
    - [x] Introduce `skipped_unassigned` counter in `NotifyExpiredJob`.
    - [x] Update metrics logic to distinguish between sent notifications and skipped tasks.
- [x] Task: Improve Sync Logging
    - [x] Update `scripts/sync-staging.ts` to capture and log the full error object in `createIndex` catch block.
- [x] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
