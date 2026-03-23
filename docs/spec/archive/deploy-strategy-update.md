# Spec: Deploy Strategy Update

## Status

complete (historical)

**Superseded for hosting (2026-03):** The Next.js app is deployed on **Vercel**, not Appwrite Sites. Appwrite remains the **backend** only. The checklist below reflects the intermediate “Appwrite Sites + GitHub” era.

## Problem

The GitHub Actions deployment strategy (deploy-staging.yml, deploy-prod.yml) added complexity and duplicated secret management. At the time, moving deploy to a Git-connected host was intended to simplify CD and centralize runtime secrets.

## Requirements

### Functional

- [x] Delete `.github/workflows/deploy-prod.yml`
- [x] Delete `.github/workflows/deploy-staging.yml`
- [x] Delete `scripts/sync-staging.ts` and other deployment scripts
- [x] No extraneous deployment dependencies or configurations remain

### Non-Functional

- [x] `ci.yml` remains as quality gate (not modified for deployment)
- [x] `cron.yml` not modified *(historical; cron later moved to Vercel — see `vercel.json` and `docs/deployment.md`)*

## Acceptance Criteria

- [x] Deploy workflows removed
- [x] Deployment scripts removed
- [x] ~~Appwrite handles deployment via branch watching~~ → **Current:** Vercel + GitHub for the app; Appwrite not used as web host
- [x] ~~Secrets managed in Appwrite Console~~ → **Current:** Vercel env for runtime; Appwrite Console for Appwrite keys/schema

## Technical Approach

Replaced GitHub Actions deployment workflows with Git-connected hosting. **Originally** Appwrite Sites watched Git branches; **current** model uses **Vercel** for builds and env injection (see `docs/deployment.md`).

## References

- Checkpoint commit: `d3ade4d`
- Original track: `conductor/tracks/deploy_strategy_update_20260220/` (removed)
