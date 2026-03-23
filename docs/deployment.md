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
- Build: `npm run build` (strict env validation with CI placeholders)

This workflow does **not** handle deployment. It serves strictly as a quality gate.

## 2. Staging Deployment

**Trigger**: Push to the `staging` branch (usually via PR merge).

- Appwrite is connected directly to the GitHub repository
- Listens for pushes to `staging` and auto-deploys to the Staging Appwrite Site
- Environment variables managed in the Appwrite Console (Staging project)
- For the staging Appwrite project, set `NODE_ENV=staging` in the Console so the app title and metadata show a `[STAGING]` prefix and distinguish the environment from production.

## 3. Production Deployment

**Trigger**: Push to the `main` branch.

- Appwrite listens for pushes to `main` and auto-deploys to the Production Appwrite Site
- Environment variables managed in the Appwrite Console (Production project)

## Secret Management

- **Local development**: `.env.local` file (not committed)
- **Staging/Production**: Managed in the Appwrite Console for their respective projects
- **CI**: Minimal secrets in GitHub (only what's needed for quality gates)

## Environment Matrix (Minimum Required)

| Concern       | Variables                                                                              |
| ------------- | -------------------------------------------------------------------------------------- |
| App URL       | `NEXT_PUBLIC_APP_URL`                                                                  |
| Appwrite      | `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY` |
| Discord Core  | `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_HOUSING_CHANNEL_ID`                  |
| Discord Roles | `DISCORD_ROLE_ID_BROTHER`, `DISCORD_ROLE_ID_CABINET`, `DISCORD_ROLE_ID_HOUSING_CHAIR`  |
| AWS/S3        | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME`          |
| Cron          | `CRON_SECRET`                                                                          |

`SKIP_ENV_VALIDATION=true` is intended for local fallback scenarios only when intentionally bypassing strict checks. CI should validate against a complete placeholder matrix, and runtime staging/production should validate with real environment values.

## Appwrite Environment Checklist (Per Site)

Before promoting a merge to `main`, verify the target Appwrite Site has these keys configured:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_BUCKET_NAME`
- `DISCORD_APP_ID`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_HOUSING_CHANNEL_ID`
- `DISCORD_ROLE_ID_BROTHER`
- `DISCORD_ROLE_ID_CABINET`
- `DISCORD_ROLE_ID_HOUSING_CHAIR`
- `CRON_SECRET`

For production specifically, the three `DISCORD_ROLE_ID_*` keys must be present before deployment. Missing role IDs can break role-gated runtime flows even when unrelated routes (such as image proxying) build successfully.

## Appwrite: extending `notification_level` (housing)

The app may introduce new persisted values for `assignments.notification_level` (for example `expired_admin`).

1. **If the attribute is a string** in Appwrite (common): no schema migration is required; any new value the code writes is accepted.
2. **If the attribute is an enum**: add the new value to the enum in the Appwrite Console, or run:

   ```bash
   APPWRITE_TARGET_PROJECT_ID="<project id>" \
   APPWRITE_TARGET_API_KEY="<server API key with databases.write>" \
   npx tsx scripts/add-expired-admin-notification-enum.ts
   ```

   With no `APPWRITE_TARGET_*` overrides, the script uses `NEXT_PUBLIC_APPWRITE_PROJECT_ID` and `APPWRITE_STAGING_API_KEY` / `APPWRITE_API_KEY`. It reads the attribute type first; string attributes are a no-op.

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
- Cron endpoint auth contract and HOURLY dispatch health (manual run path)
- Housing expiry notification dependencies (`DISCORD_HOUSING_CHANNEL_ID`, bot DM capability)

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

1. Verify the user has the Brother role for baseline access.
2. Ensure the user has a housing-admin role for housing mutations.
3. Check that staging role IDs point to the correct guild roles (not production roles).

### Symptom: Cron workflow fails with `curl (22)` and HTTP `500`

1. Run a no-redeploy preflight request against the currently deployed URL (from local shell):

   ```bash
   BASE_URL="<staging-app-url>"
   CRON_SECRET="<staging-cron-secret>"
   curl --silent --show-error \
     -H "Authorization: Bearer ${CRON_SECRET}" \
     "${BASE_URL%/}/api/cron"
   ```

2. Interpret preflight status before running `job=HOURLY`:
   - When the server returns `400` with `INVALID_JOB`, auth and runtime cron config are aligned (safe to run HOURLY).
   - If you receive `401` with `UNAUTHORIZED`, the GitHub/CLI secret does not match deployed runtime `CRON_SECRET`.
   - When `500` indicates `SERVER_CONFIG_ERROR`, the deployed runtime is missing `CRON_SECRET` (Appwrite env issue).
   - When `500` indicates `JOB_EXECUTION_FAILED`, runtime dependencies failed during execution; inspect app logs.
3. In Appwrite Console for the target site (staging or production), verify:
   - `CRON_SECRET` is present and non-empty.
   - `NEXT_PUBLIC_APP_URL` matches the deployed site URL for that environment.
4. Confirm GitHub Environment configuration (`staging` or `production`) matches Appwrite runtime values:
   - variable: `NEXT_PUBLIC_APP_URL`
   - secret: `CRON_SECRET`
5. Re-deploy only if Appwrite environment values changed (Appwrite does not always apply env edits to already-running builds).
6. Re-run manual cron dispatch after preflight passes:
   - `gh workflow run cron.yml --ref staging -f environment=staging`
7. Confirm endpoint auth contract is Bearer header (`Authorization: Bearer <CRON_SECRET>`), not query-string `key`.

## Cron Jobs

- GitHub Actions workflow (`cron.yml`) runs on a `*/12 * * * *` schedule (every 12 minutes). The endpoint call uses `job=HOURLY` as a logical job name — it refers to the batch of hourly-cadence tasks (unlock, notify, expire) that are safe to run more frequently than once per hour.
- **Scheduled runs** always target the `production` environment (the schedule trigger has no environment input).
- **Manual runs** (`workflow_dispatch`) allow selecting `production` or `staging` via the `environment` input, which controls which GitHub Environment values are used (`NEXT_PUBLIC_APP_URL` from environment variable, `CRON_SECRET` from environment secret).
- The cron endpoint authenticates with `Authorization: Bearer <CRON_SECRET>`. Do not pass the secret as a query parameter.
- The workflow uses connection and wall-clock timeouts (`--connect-timeout`, `--max-time`) on curl calls. The `job=HOURLY` trigger intentionally omits transport-level `--retry` so a retried HTTP request cannot duplicate side effects (notifications). A concurrency group prevents overlapping cron runs.
