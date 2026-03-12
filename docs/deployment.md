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

## Environment Matrix (Minimum Required)

| Concern | Variables |
|---|---|
| App URL | `NEXT_PUBLIC_APP_URL` |
| Appwrite | `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY` |
| Discord Core | `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_HOUSING_CHANNEL_ID` |
| Discord Roles | `DISCORD_ROLE_ID_BROTHER`, `DISCORD_ROLE_ID_CABINET`, `DISCORD_ROLE_ID_HOUSING_CHAIR` |
| AWS/S3 | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME` |
| Cron | `CRON_SECRET` |

`SKIP_ENV_VALIDATION=true` is intended for CI/build fallback scenarios only. Runtime staging validation should be done with real environment values.

## Staging Runtime Diagnostics

Use the diagnostics script from the repo root:

```bash
npm run diagnose:staging
```

What it verifies:

- Appwrite admin access to critical collections (`users`, `assignments`)
- Discord guild reachability with bot token
- Discord housing channel reachability
- Configured housing role IDs exist in the target guild

If this command fails, do not promote staging to production until the failing checks are resolved.

## Staging Troubleshooting Runbook

### Symptom: “Failed to assign duty” / task creation fails

1. Run `npm run diagnose:staging`.
2. If Appwrite checks fail:
   - verify endpoint and project ID refer to staging,
   - verify `APPWRITE_API_KEY` belongs to staging project and has database permissions.
3. If Discord checks fail:
   - verify `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, and housing role IDs,
   - confirm the configured role IDs exist in the guild.
4. Re-run diagnostics and then re-test task creation in staging UI.

### Symptom: User can view dashboard but mutation fails with authorization

1. Confirm the user has the Brother role for baseline access.
2. Confirm the user has a housing-admin role for housing mutations.
3. Confirm staging role IDs point to the correct guild roles (not production roles).

## Cron Jobs

- GitHub Actions workflow (`cron.yml`) runs on a `*/12 * * * *` schedule (every 12 minutes). The endpoint call uses `job=HOURLY` as a logical job name — it refers to the batch of hourly-cadence tasks (unlock, notify, expire) that are safe to run more frequently than once per hour.
- **Scheduled runs** always target the `production` environment (the schedule trigger has no environment input).
- **Manual runs** (`workflow_dispatch`) allow selecting `production` or `staging` via the `environment` input, which controls which GitHub Environment secrets (and therefore which `NEXT_PUBLIC_APP_URL` and `CRON_SECRET`) are used.
