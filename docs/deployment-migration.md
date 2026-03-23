# Deployment migration (Vercel): discovery and naming

This document is **Stage 1**: inventory of current repo references, canonical naming for the target state, **contradictions** between docs and that target, and **proposed work** grouped by migration stages 2–10. No runtime or workflow behavior is changed here.

## Canonical front-end URLs (target)

These hosts are the **agreed migration targets** for the web app (not yet present in application source; see [Inventory: domain strings](#inventory-domain-strings)):

| Slot        | URL                         |
| ----------- | --------------------------- |
| Staging     | `https://staging.taunufiji.app` |
| Production  | `https://taunufiji.app`         |

**Appwrite API host** (custom domain, appears in repo): `https://appwrite.taunufiji.app` — see `next.config.ts` CSP and `docs/changelog.md`.

## Glossary (naming)

| Term | Meaning |
| ---- | ------- |
| **Git branch `main`** | Target integration branch for feature work (post-migration). |
| **Git branch `staging`** | Legacy integration branch; to be merged into `main` with a **merge commit** (not squash) in a later stage, then removed. |
| **Git branch `production`** | Not used as a branch name in this repo’s workflows today; **production** refers to the **GitHub Environment** name and the live slot. |
| **GitHub Environment `staging`** | Named environment for variables/secrets used when targeting the staging slot (e.g. manual cron to staging). Stays named **`staging`** per migration plan. |
| **GitHub Environment `production`** | Named environment for production variables/secrets. Scheduled cron uses this environment today. |
| **Vercel Preview** | Staging slot: staging Appwrite keys and preview URL / assigned domain (`staging.taunufiji.app` per plan). |
| **Vercel Production** | Production slot: production Appwrite keys and production URL (`taunufiji.app`). |
| **Appwrite project (staging)** | Staging Appwrite project (unchanged count: two projects total). |
| **Appwrite project (production)** | Production Appwrite project. |
| **`NEXT_PUBLIC_APP_URL`** | Must match the **deployed front-end origin** for that environment (used as `BASE_URL` in `lib/constants.ts` and validated in cron workflow). |

## Inventory: branches, environments, and deployment

| Location | What it says / does |
| -------- | ------------------- |
| `.github/workflows/ci.yml` | `push` / `pull_request` on branches **`main`** and **`staging`**. |
| `.github/workflows/cron.yml` | `workflow_dispatch` input **`environment`**: `production` \| **`staging`**. Job `environment:` resolves to that input or defaults to **`production`**. **Scheduled** cron has no branch input; uses **`production`** GitHub Environment. Calls `vars.NEXT_PUBLIC_APP_URL` + `secrets.CRON_SECRET`. |
| `docs/deployment.md` | Pipeline: merge to **`staging`** → Appwrite Staging Site; merge to **`main`** → Appwrite Production Site. GitHub Environments **`staging`** / **`production`** for cron. |
| `docs/architecture.md` | Deployment: Appwrite watches **`staging`** / **`main`** → Staging / Production **Site**. |
| `docs/tech-stack.md` | **CD**: Appwrite/GitHub integration, branches **`staging`** and **`main`**. |
| `docs/spec/current/staging-environment-setup.md` | **`staging`** branch, Appwrite → Staging Site, CI on **`main`** and **`staging`**, cron **`staging`**. |
| `docs/spec/archive/deploy-strategy-update.md` | Historical: direct Appwrite/GitHub integration, **`main`** / **`staging`**. |
| `docs/changelog.md` | References **`staging`** / **`main`**, Appwrite Sites, removal of Vercel comments (historical). |
| `docs/behavior.md` | Links to staging spec; staging QA wording. |
| `AGENTS.md` | **Branch workflow**: integration branch **`staging`**, PRs to **`staging`**, do not commit to **`staging`** / **`main`**. |

## Inventory: Appwrite Sites

| Location | Role |
| -------- | ---- |
| `docs/deployment.md` | Describes Staging / Production **Appwrite Sites** as the deploy targets. |
| `docs/deployment.md` (runbook) | Appwrite Sites troubleshooting (`runtime_timeout`, warm `/health.txt`). |
| `scripts/inspect-appwrite-site-deployments.ts` | Lists Appwrite **Sites** deployments via API (`npm run inspect:appwrite-sites`). |
| `package.json` | Script `inspect:appwrite-sites`. |

## Inventory: cron

| Location | Role |
| -------- | ---- |
| `.github/workflows/cron.yml` | Schedule + manual dispatch; preflight and `GET .../api/cron?job=HOURLY` with `Authorization: Bearer`. |
| `docs/deployment.md` | Cron jobs section; manual `gh workflow run cron.yml --ref staging -f environment=staging`. |
| `app/api/cron/route.ts` | Cron HTTP handler (not duplicated here; see route + `route.test.ts`). |
| Application jobs | `lib/application/services/jobs/*`, `HousingTimeDrivenPipeline`, references in `docs/architecture.md` / `docs/behavior.md`. |

## Inventory: CSP and `next.config.ts`

```31:34:next.config.ts
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://cloud.appwrite.io https://appwrite.taunufiji.app https://cdn.discordapp.com; font-src 'self'; connect-src 'self' https://appwrite.taunufiji.app https://cloud.appwrite.io;",
```

- **`connect-src 'self'`**: browser fetches to the **current page origin** (the deployed Next app). After moving the app to Vercel, **`self`** is the Vercel deployment host (e.g. `https://taunufiji.app` or `https://staging.taunufiji.app`); **no extra CSP hostname is required** solely because the front end moved hosts—only if new third-party origins are used.
- **Appwrite**: `https://appwrite.taunufiji.app` and `https://cloud.appwrite.io` are already allowlisted for `img-src` and `connect-src`.

## Inventory: `NEXT_PUBLIC_APP_URL`

| Location | Role |
| -------- | ---- |
| `lib/constants.ts` | `BASE_URL` from `clientEnv.NEXT_PUBLIC_APP_URL`. |
| `lib/infrastructure/config/server-env-schema.ts`, `client-env.ts`, `env.test.ts` | Validation / client env. |
| `vitest.setup.ts` | Test default for `NEXT_PUBLIC_APP_URL`. |
| `.github/workflows/ci.yml` | Placeholder `https://example.com` for build. |
| `.github/workflows/cron.yml` | Requires `vars.NEXT_PUBLIC_APP_URL` per GitHub Environment. |
| `docs/deployment.md` | Matrix, Appwrite checklist, cron alignment with deployed URL. |

### Inventory: domain strings

`rg taunufiji` in the repo finds:

- `https://appwrite.taunufiji.app` — **in** `next.config.ts` (CSP).
- `taunufiji.app` — **in** `docs/changelog.md` (custom domain narrative).
- **Not found in repo**: literal `https://staging.taunufiji.app` or `https://taunufiji.app` as app URLs (those are **configuration / migration targets**, not hardcoded in source today).

## Contradictions (flagged, not “fixed” in code here)

1. **Integration branch**: **`AGENTS.md`** and several **docs** describe **`staging`** as the integration branch and PR target. The **migration target** is **`main`** for feature integration. Updating contributor docs and workflows belongs in a later stage; do **not** change the GitHub **default** branch without explicit human approval.
2. **Hosting narrative**: **`docs/deployment.md`**, **`docs/architecture.md`**, **`docs/tech-stack.md`**, and **`docs/spec/current/staging-environment-setup.md`** describe **Appwrite Sites** + branch-triggered deploys. The **target** is **Vercel** (Hobby) for the front end; Appwrite remains **two projects** (API/auth/DB), not the static hosting story.
3. **Changelog history**: **`docs/changelog.md`** notes removal of stale **Vercel** comments when the app was on Appwrite—historical context only; it does not describe the future Vercel cutover.
4. **Cron vs “production” naming**: **`cron.yml`** scheduled runs always use the **`production`** GitHub Environment. After front-end staging lives on Vercel Preview + **`main`**, decide whether scheduled jobs should hit **production URL only** or whether a second schedule / different convention is needed—**out of scope for Stage 1** (document only).

## Proposed edits by migration stage (2–10)

High-level only; implement in later PRs.

| Stage | Proposed focus |
| ----- | -------------- |
| **2** | Vercel project (Hobby): connect repo, **Production** → `taunufiji.app`, **Preview** → `staging.taunufiji.app` on branch **`main`** per Vercel docs; map env vars (Preview = staging Appwrite keys, Production = production keys). |
| **3** | Set **`NEXT_PUBLIC_APP_URL`** in Vercel (and keep GitHub Environment vars in sync for **cron**) to `https://staging.taunufiji.app` / `https://taunufiji.app` respectively. |
| **4** | Align **GitHub Actions** with **`main`**: e.g. `ci.yml` branch filters, `cron.yml` manual `gh workflow run ... --ref` examples in docs. |
| **5** | Rewrite **`docs/deployment.md`**, **`docs/architecture.md`**, **`docs/tech-stack.md`** for Vercel + retained GitHub Environments **`staging`** / **`production`**. |
| **6** | Update **`AGENTS.md`** branch workflow for **`main`**; archive or supersede **`staging`**-centric spec sections when legacy branch is merged. |
| **7** | Appwrite Sites: decommission or document **read-only** use of `inspect-appwrite-site-deployments.ts` after cutover. |
| **8** | Legacy **`staging`** branch: **merge commit** into **`main`**, then delete branch (human-driven git operation). |
| **9** | Post-cutover verification: OAuth redirect URLs, cookies/session across `appwrite.taunufiji.app`, cron preflight from GitHub. |
| **10** | **`docs/changelog.md`** entry shipping the migration; remove obsolete Appwrite Sites runbook sections or mark historical. |

**Explicit non-goals for this stage**

- Do **not** merge branch **`c/housing-task-behavior-d985`**.
- Do **not** change the GitHub **default** branch without explicit human approval.

## Related

- Current operational runbook: [`docs/deployment.md`](./deployment.md)
- Staging spec (pre-Vercel narrative): [`docs/spec/current/staging-environment-setup.md`](./spec/current/staging-environment-setup.md)
