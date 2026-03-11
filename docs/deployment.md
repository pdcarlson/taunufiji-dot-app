# Deployment Workflow

## Pipeline Overview

```text
Feature Branch → PR (CI Quality Gates) → Merge to staging → Appwrite deploys Staging
                                                              ↓
                                              Manual QA → Merge to main → Appwrite deploys Production
```

## 1. Quality Gates (`ci.yml`)

**Trigger**: Opening a PR or pushing to `main`/`staging`.

- Installs dependencies (`npm ci`)
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`
- Tests: `npm run test`
- Build: `npm run build` (with `SKIP_ENV_VALIDATION=true`)

This workflow does **not** handle deployment. It serves strictly as a quality gate.

## 2. Staging Deployment

**Trigger**: Push to the `staging` branch (usually via PR merge).

- Appwrite is connected directly to the GitHub repository
- Listens for pushes to `staging` and auto-deploys to the Staging Appwrite Site
- Environment variables managed in the Appwrite Console (Staging project)

## 3. Production Deployment

**Trigger**: Push to the `main` branch.

- Appwrite listens for pushes to `main` and auto-deploys to the Production Appwrite Site
- Environment variables managed in the Appwrite Console (Production project)

## Secret Management

- **Local development**: `.env.local` file (not committed)
- **Staging/Production**: Managed in the Appwrite Console for their respective projects
- **CI**: Minimal secrets in GitHub (only what's needed for quality gates)

## Cron Jobs

- GitHub Actions workflow (`cron.yml`) runs on a `*/12 * * * *` schedule (every 12 minutes). The endpoint call uses `job=HOURLY` as a logical job name — it refers to the batch of hourly-cadence tasks (unlock, notify, expire) that are safe to run more frequently than once per hour.
- **Scheduled runs** always target the `production` environment (the schedule trigger has no environment input).
- **Manual runs** (`workflow_dispatch`) allow selecting `production` or `staging` via the `environment` input, which controls which GitHub Environment secrets (and therefore which `NEXT_PUBLIC_APP_URL` and `CRON_SECRET`) are used.
