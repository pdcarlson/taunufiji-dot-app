# Spec: Staging Environment Setup

## Status

in-progress

## Problem

The project needs a fully functional staging environment to test changes before production deployment. The original staging setup track began on 2026-02-19 and made significant progress, but some validation steps remain incomplete. The deployment strategy was subsequently changed from GitHub Actions to direct Appwrite/GitHub integration, which supersedes parts of the original plan.

## Requirements

### Functional

- [x] `staging` branch exists and is deployable
- [x] Appwrite watches `staging` branch and auto-deploys to Staging Site
- [x] Environment variable validation supports Local/Staging/Production contexts
- [x] CI quality gates (`ci.yml`) run on pushes and PRs to both `main` and `staging`
- [x] Cron workflow supports targeting `staging` environment
- [x] No hardcoded production URLs or Discord IDs in the codebase
- [x] Dynamic page titles prefix environment name (e.g., `[STAGING]`)
- [ ] Staging environment manually verified end-to-end

### Non-Functional

- [x] No production secrets present in the repository
- [x] Clear environment differentiation in the UI
- [x] `SKIP_ENV_VALIDATION` bypass available for CI builds

## Acceptance Criteria

- [x] `npm run build` succeeds with staging environment variables
- [x] CI quality gates pass on the `staging` branch
- [x] `env.ts` correctly differentiates between required and optional keys
- [ ] A clean staging deployment is verified (manually or via logs)
- [ ] End-to-end walkthrough on staging (login, view dashboard, complete a housing duty)

## Technical Approach

- Appwrite/GitHub direct integration handles deployment (no GitHub Actions deploy workflows)
- Secrets managed in Appwrite Console per environment
- `env.ts` uses Zod validation with `SKIP_ENV_VALIDATION` escape hatch
- Branding constants in `lib/constants.ts` support environment-aware titles

## Out of Scope

- Automated prod → staging data sync (script removed with deploy strategy update)
- Discord command auto-sync on deploy (originally planned, now manual via `npm run discord:register`)

## References

- Archived: `staging_setup_20260219` (conductor tree removed)
- Superseded by: [Deploy Strategy Update](completed/deploy-strategy-update.md) spec
- Deployment docs: [docs/deployment.md](../docs/deployment.md)
