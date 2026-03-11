# Spec: Staging Environment Setup

## Status

in-progress

## Problem

The project needs a fully functional staging environment to test changes before production deployment. The original staging setup track began on 2026-02-19 and made significant progress, but some validation steps remain incomplete. The deployment strategy was subsequently changed from GitHub Actions to direct Appwrite/GitHub integration, which supersedes parts of the original plan.

The current gap is not deployment wiring — it is **runtime confidence**. Staging can appear healthy while role checks, environment mismatches, and data mutations still fail in ways that are difficult to diagnose.

## Requirements

### Functional

- [x] `staging` branch exists and is deployable
- [x] Appwrite watches `staging` branch and auto-deploys to Staging Site
- [x] Environment variable validation supports Local/Staging/Production contexts
- [x] CI quality gates (`ci.yml`) run on pushes and PRs to both `main` and `staging`
- [x] Cron workflow supports targeting `staging` environment
- [x] No hardcoded production URLs or Discord IDs in the codebase
- [x] Dynamic page titles prefix environment name (e.g., `[STAGING]`)
- [ ] Runtime environment diagnostics report Appwrite + Discord connectivity and fail clearly
- [ ] Housing mutation actions enforce housing-admin RBAC on the server
- [ ] Task-creation UI surfaces categorized failure causes (auth, role, validation, infra)
- [ ] Staging environment manually verified end-to-end

### Non-Functional

- [x] No production secrets present in the repository
- [x] Clear environment differentiation in the UI
- [x] `SKIP_ENV_VALIDATION` bypass available for CI builds
- [ ] Staging failures are diagnosable in under 10 minutes using a documented runbook

## Acceptance Criteria

- [x] `npm run build` succeeds with staging environment variables
- [x] CI quality gates pass on the `staging` branch
- [x] `env.ts` correctly differentiates between required and optional keys
- [ ] A single command verifies staging-critical environment health (Appwrite DB access + Discord role lookup path)
- [ ] Housing task create/update/delete/schedule mutations are rejected for non-admin users
- [ ] Task creation failures provide actionable user and server diagnostics
- [ ] A clean staging deployment is verified (manually or via logs)
- [ ] End-to-end walkthrough on staging (login, view dashboard, complete a housing duty)

## Technical Approach

- Appwrite/GitHub direct integration handles deployment (no GitHub Actions deploy workflows)
- Secrets managed in Appwrite Console per environment
- `env.ts` uses Zod validation with `SKIP_ENV_VALIDATION` escape hatch
- Branding constants in `lib/constants.ts` support environment-aware titles
- Add a staging diagnostics utility that validates runtime dependencies without exposing secrets
- Enforce housing-admin roles in server actions using `actionWrapper` `allowedRoles`
- Add integration/e2e coverage for critical staging readiness paths

## Out of Scope

- Automated prod → staging data sync (script removed with deploy strategy update)
- Discord command auto-sync on deploy (originally planned, now manual via `npm run discord:register`)
- Full repository-wide 90% coverage in a single change set (handled as phased rollout)

## References

- Archived: `staging_setup_20260219` (conductor tree removed)
- Deployment strategy superseded by: [Deploy Strategy Update](completed/deploy-strategy-update.md); remaining sections of this spec (environment verification, end-to-end walkthrough) are still in-progress
- Deployment docs: [docs/deployment.md](../docs/deployment.md)
- Companion implementation spec: [QA Audit and Staging Hardening](qa-audit-and-staging-hardening.md)
