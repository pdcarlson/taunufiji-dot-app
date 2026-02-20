# Specification: CI/CD Hardening & Logic Security Audit

## Overview
This track addresses a set of high-priority infrastructure and logic failures identified during the staging environment establishment. The focus is on preventing production data leaks in CI, aligning deployment secrets, and resolving critical rendering and metric calculation bugs in the application layer.

## Scope

### CI/CD & Infrastructure (Focus Area A)
- **Workflow Security**: Update `ci.yml` to use non-production placeholder endpoints for `NEXT_PUBLIC_APPWRITE_ENDPOINT` during builds.
- **Secret Alignment**: Update `deploy-prod.yml` to include `APPWRITE_API_KEY` in the build step and unify project-id secret usage (`APPWRITE_PROJECT_ID` vs `NEXT_PUBLIC_APPWRITE_PROJECT_ID`).
- **Resilient Staging**: Add `continue-on-error: true` to the "Sync Discord Commands" step in `deploy-staging.yml`.
- **Dependency Management**: Explicitly add `tsx` to `devDependencies` in `package.json`.

### Logic & Security (Focus Area C)
- **PDF Redactor**: 
    - Remove unsupported `canvas` parameter from `page.render` calls to align with `pdfjs-dist` types.
    - Resolve coordinate drift by storing redaction boxes in unscaled page coordinates and applying scaling only during render/burn-in.
- **Environment Safety**:
    - Refactor `env.ts` to export a `clientEnv` wrapper containing only browser-safe variables.
    - Implement a "tolerant re-parse" fallback in `env.ts` using `schema.partial().safeParse(process.env)`.
    - Update `appwrite.web.ts` to consume `clientEnv`.
- **Metrics & Logging**:
    - Update `NotifyExpiredJob` to explicitly track `skipped_unassigned` tasks rather than inflating `expired_notified` counters.
    - Update `sync-staging.ts` to capture and log the actual error object in the `createIndex` catch block.

## Acceptance Criteria
1. CI workflows succeed using placeholder endpoints without production fallback.
2. Production builds successfully include required API keys for server-side verification.
3. PDF redaction boxes remain perfectly aligned with underlying text across all zoom levels.
4. Client-side code has zero access to server-only environment variables via the new `clientEnv` wrapper.
5. Job metrics accurately reflect "Notifications Sent" vs "Tasks Skipped".

## Out of Scope
- Markdown linting (MD022/MD031) and documentation cleanup.
- Refactoring of `sync-staging.ts` pagination or relationship attributes (unless required for basic functionality).
- Minor typo fixes in README.md.
