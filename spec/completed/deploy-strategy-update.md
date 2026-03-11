# Spec: Deploy Strategy Update

## Status

complete

## Problem

The GitHub Actions deployment strategy (deploy-staging.yml, deploy-prod.yml) added complexity and duplicated secret management. Direct Appwrite/GitHub integration is simpler, faster, and keeps secrets centralized in the hosting platform.

## Requirements

### Functional

- [x] Delete `.github/workflows/deploy-prod.yml`
- [x] Delete `.github/workflows/deploy-staging.yml`
- [x] Delete `scripts/sync-staging.ts` and other deployment scripts
- [x] No extraneous deployment dependencies or configurations remain

### Non-Functional

- [x] `ci.yml` remains as quality gate (not modified for deployment)
- [x] `cron.yml` not modified

## Acceptance Criteria

- [x] Deploy workflows removed
- [x] Deployment scripts removed
- [x] Appwrite handles deployment via branch watching
- [x] Secrets managed in Appwrite Console

## Technical Approach

Replaced GitHub Actions deployment with direct Appwrite/GitHub integration. Appwrite watches `main` (production) and `staging` (staging) branches and auto-deploys.

## References

- Checkpoint commit: `d3ade4d`
- Original track: `conductor/tracks/deploy_strategy_update_20260220/` (removed)
