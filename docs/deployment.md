# Deployment Workflow

**Canonical split:** Vercel hosts the app; Appwrite is the backend. If anything here conflicts with another doc, prefer this file plus [`platform-map.md`](platform-map.md).

## Pipeline Overview

```text
Feature Branch → PR (CI Quality Gates) → Merge to main → Vercel Preview (staging host)
                                                              ↓
                                   Manual QA → Merge to production → Vercel Production
```

**Branches**: **`main`** is the default integration branch (preview / staging URL). **`production`** is the release branch (production deployment on Vercel). Treat **`production`** as protected: promote only after QA.

**Hosting**: The Next.js app is deployed on **Vercel** with **GitHub** connected to the repository. **Appwrite** remains the backend (Auth, Databases); it does not host this app.

## 1. Quality Gates (`ci.yml`)

**Trigger**: Pushes and pull requests targeting **`main`**, **`production`**, or **`staging`** (see `push` / `pull_request` `branches` in `.github/workflows/ci.yml`). Including **`production`** ensures required status checks run for PRs into the release branch and on direct pushes that the branch ruleset allows.

- Installs dependencies (`npm ci`)
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`
- Tests: `npm run test`
- Build: `npm run build` (strict env validation with CI placeholders)

This workflow does **not** handle deployment. It serves strictly as a quality gate.

## 2. Staging deployment (preview)

**Trigger**: Push to **`main`** (usually via PR merge from a feature branch).

- **Vercel** builds and deploys **Preview** deployments from **`main`** (and from other branches as configured in the Vercel project).
- **Environment variables** for preview/staging behavior live in the **Vercel** project (Preview / custom environments), not in Appwrite Console for hosting.
- Use a **staging** Appwrite **project** (separate from production) for data and auth on the staging URL; point `NEXT_PUBLIC_APPWRITE_*` and `APPWRITE_API_KEY` at that project in the Vercel env for the preview/staging environment.
- Set `NODE_ENV=staging` (or equivalent) in Vercel for the staging/preview environment so the app title and metadata can show a `[STAGING]` prefix.

## 3. Production deployment

**Trigger**: Push to the **`production`** branch (per Vercel **Production Branch** setting for the project).

- **Vercel** builds and deploys **Production** from **`production`** when that branch is configured as the production branch in the Vercel Git integration.
- **Environment variables** for production are configured in **Vercel** (Production environment).
- **Appwrite production** credentials belong in Vercel Production env vars, not only in the Appwrite Console (the Console is where you create API keys; Vercel injects them at runtime).

## Git branches, default branch, and protection (Stage 2)

Complete this in GitHub so the branch model above matches repo settings. **Doc-only updates do not replace applying settings in GitHub.**

### Human checklist (GitHub UI)

1. **Default branch (`main`)** — Repo **Settings → General → Default branch** → **`main`**. Verify: opening **New pull request** defaults the base branch to **`main`**.
2. **Inventory** — **Settings → Rules** (rulesets) and/or **Settings → Branches**. Note rules targeting **`main`**, **`production`**, and any leftover **`staging`**.
3. **`main`** — Match or exceed what **`staging`** had before the migration (required PRs, required status checks, review rules, etc.).
4. **`production`** — Match or exceed what **`main`** had before the migration, plus extra safeguards as needed (e.g. block force-push, restrict who can push).
5. **Cleanup** — Remove rules that only applied to the deleted **`staging`** branch if they are redundant.

**Verify**: Attempt an operation your policy should block (for example a direct push to **`production`** without a PR) and confirm GitHub rejects it.

### Automating GitHub repo settings (maintainers)

Use a **fine-grained PAT** with access to this repository. For **organization** repositories, authorize the PAT for SSO: **Settings → Developer settings → Personal access tokens → … → Configure SSO**.

The GitHub CLI reads **`GH_TOKEN`** (or **`GITHUB_TOKEN`**) from the environment. If your tooling only injects a differently named secret (for example **`GITHUB_PERSONAL_ACCESS_TOKEN`** in Cursor Cloud), export it before calling `gh`:

```bash
export GH_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"
```

**Smoke test** (local shell; do not rely on `GITHUB_TOKEN` inside Actions for admin API calls):

```bash
export GH_TOKEN="<fine-grained-pat>"
gh auth status -h github.com
gh api repos/OWNER/REPO \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28"
```

- **401** — wrong or expired token, or `GH_TOKEN` not exported in this shell.
- **403** — often missing repo scope or **SSO** not enabled for the PAT on the org.
- **404** — wrong `OWNER/REPO`, or PAT cannot access that repository.

If the UI uses **repository rulesets**, prefer the [rulesets API](https://docs.github.com/en/rest/repos/rules) when automating; legacy branch-protection endpoints may not match what the UI shows.

**Example** (read-only; redact secrets; replace `OWNER/REPO`):

```bash
export GH_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"
gh api repos/OWNER/REPO/rulesets -H "X-GitHub-Api-Version: 2022-11-28"
```

**Example** (create or update rulesets — requires `administration: write` on the repository; adjust JSON to match your policy):

```bash
export GH_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"
gh api --method POST repos/OWNER/REPO/rulesets \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  --input ruleset-payload.json
```

### Repository rulesets (reference)

This repo uses **branch rulesets** (not legacy branch protection API). As configured for **`main`** and **`production`**:

| Ruleset | Branch | Policy (summary) |
| ------- | ------ | ---------------- |
| Protect main (integration) | `refs/heads/main` | Pull request required (**1** approval), required status checks (see below), **block force-push** (`non_fast_forward`) |
| Protect production (release) | `refs/heads/production` | Pull request required (**2** approvals), same required checks, **block force-push**, **block branch deletion** |

Required status check contexts (from `ci.yml` job ids; `validate-secrets` is optional when skipped): `lint`, `typecheck`, `test`, `coverage-critical`, `e2e-smoke`, `build`, `quality-gate`. **Strict** policy: the merge head must be up to date with the base branch.

Tweak review counts or check contexts in **Settings → Rules** if your team’s bar differs (for example if two approvals on `production` is heavier than the old `main` bar).

## Secret management

- **Local development**: `.env.local` file (not committed)
- **Staging / production (runtime)**: Environment variables in **Vercel** per environment (Preview vs Production). Appwrite **API keys** are created in the **Appwrite Console** per Appwrite project, then stored as secrets in Vercel.
- **CI**: Minimal secrets in GitHub (only what quality gates need)

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

## Runtime environment checklist (Vercel)

Before promoting a merge to **`production`**, verify the **Vercel Production** environment has these variables set (and that **Preview** / staging has the staging Appwrite project values where they differ):

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

The script loads `.env.local` when present (same staging keys as the app: Appwrite, AWS placeholders if required by schema, Discord bot + guild + housing channel + `DISCORD_ROLE_ID_*` role IDs). It validates env with `serverEnvSchema` before running checks.

From the repo root:

```bash
npm run diagnose:staging
```

Exit code `0` prints a line per check with pass/fail; exit code `1` if validation fails or any check fails.

What it verifies today:

- Appwrite admin access to critical collections (`users`, `assignments`)
- Discord guild reachability with bot token
- Discord housing channel reachability
- Configured housing role IDs exist in the target guild

If this command fails, do not promote staging to production until the failing checks are resolved.

## Staging Troubleshooting Runbook

### Symptom: Deploy succeeds but first request is slow or times out

This is often **cold start** or heavy SSR on the first hit after idle.

1. **Confirm the Vercel deployment build** succeeded: Vercel dashboard → **Deployments** → open the deployment → **Build Logs**.
2. **Warm the runtime** after deploy: hit a **static** URL first (served from the edge without running the full app), e.g. `https://<your-host>/health.txt`, then load `/login` or the dashboard. **`/` is not a good probe**—it redirects and pulls in heavier server work.
3. Use **Vercel** request / function logs for the deployment to see slow routes or errors.

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
   - When `500` indicates `SERVER_CONFIG_ERROR`, the deployed runtime is missing `CRON_SECRET` (hosting env issue).
   - When `500` indicates `JOB_EXECUTION_FAILED`, runtime dependencies failed during execution; inspect app logs.
3. In **Vercel** for the target deployment environment (Preview/staging or Production), verify:
   - `CRON_SECRET` is present and non-empty.
   - `NEXT_PUBLIC_APP_URL` matches the deployed site URL for that environment.
4. Confirm GitHub Environment configuration (`staging` or `production`) matches **deployed** runtime values:
   - variable: `NEXT_PUBLIC_APP_URL`
   - secret: `CRON_SECRET`
5. **Redeploy** after changing environment variables if the platform does not hot-reload them for existing deployments (Vercel typically requires a new deployment for env changes to take effect).
6. Re-run manual cron dispatch after preflight passes:
   - `gh workflow run cron.yml --ref main -f environment=staging`
7. Confirm endpoint auth contract is Bearer header (`Authorization: Bearer <CRON_SECRET>`), not query-string `key`.

## Cron Jobs

- GitHub Actions workflow (`cron.yml`) runs on a `*/12 * * * *` schedule (every 12 minutes). The endpoint call uses `job=HOURLY` as a logical job name — it refers to the batch of hourly-cadence tasks (unlock, notify, expire) that are safe to run more frequently than once per hour.
- **Scheduled runs** always target the `production` environment (the schedule trigger has no environment input).
- **Manual runs** (`workflow_dispatch`) allow selecting `production` or `staging` via the `environment` input, which controls which GitHub Environment values are used (`NEXT_PUBLIC_APP_URL` from environment variable, `CRON_SECRET` from environment secret).
- The cron endpoint authenticates with `Authorization: Bearer <CRON_SECRET>`. Do not pass the secret as a query parameter.
- The workflow uses connection and wall-clock timeouts (`--connect-timeout`, `--max-time`) on curl calls. The `job=HOURLY` trigger intentionally omits transport-level `--retry` so a retried HTTP request cannot duplicate side effects (notifications). A concurrency group prevents overlapping cron runs.
