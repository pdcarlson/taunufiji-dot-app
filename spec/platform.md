# Platform (read this first)

This page exists so nobody confuses **where the app runs** with **where data and auth live**.

| Concern | System | Notes |
| -------- | ------ | ----- |
| **Next.js app (hosting, builds, edge, serverless)** | **Vercel** | Connected to GitHub. Env vars for the **running app** are set in **Vercel** (Preview vs Production). |
| **Database, Auth, user documents** | **Appwrite** | **Not** the web host. API keys are created in the Appwrite Console, then copied into **Vercel** env as secrets. |
| **Appwrite API hostname (TLS)** | **Appwrite Cloud edge** | Browsers use `NEXT_PUBLIC_APPWRITE_ENDPOINT`. For first-party cookies and OAuth, that host must be **under the same registrable domain as the web app** (for example `appwrite.example.edu` when the app is served from `www.example.edu`). **Vercel DNS** can hold the CNAME, but **TLS is issued by whoever terminates HTTPS for that CNAME** (Appwrite when it points at `*.cloud.appwrite.io`). Do **not** point production `NEXT_PUBLIC_APPWRITE_ENDPOINT` at a regional `https://<region>.cloud.appwrite.io/v1` URL — see [Environments: Appwrite API hostname](../docs/deployment/environments.md#appwrite-api-hostname-same-site-as-the-app) and [Troubleshooting: Appwrite TLS](../docs/deployment/troubleshooting.md#appwrite-api-hostname-tls-and-custom-domains). |
| **File storage (library uploads)** | **AWS S3** | Credentials in **Vercel** env. |
| **Discord (roles, DMs, slash commands)** | **Discord API** | Bot token and role IDs in **Vercel** env. Command registration: `npm run discord:register` (manual). |
| **CI (lint, test, build)** | **GitHub Actions** | `ci.yml` — quality gates only; it does **not** deploy the Next.js app. |
| **Scheduled jobs hitting `/api/cron`** | **Vercel Cron** | `vercel.json` — GET `/api/cron?job=HOUSING_BATCH` to **production** deployment (once daily on current config); Vercel sends `Authorization: Bearer` using project `CRON_SECRET`. |

## Git branches (do not mix with "staging" the environment)

| Git branch | Typical role |
| ---------- | ------------- |
| **`main`** | Integration branch; merges here trigger **Vercel Preview** (and may power a **staging URL** via custom domain / env config). |
| **`production`** | Release branch; when set as Vercel's **Production Branch**, merges here update the production deployment. |
| **`staging`** | May still exist for **CI compatibility** only. It is **not** the primary integration branch. |

**Naming trap:** "Staging" often means the **staging Appwrite project** + **staging URL** (Vercel Preview / custom domain), not necessarily a branch named `staging`.

## Obsolete mental models (ignore in new work)

- **Appwrite Sites** as the Next.js host — removed; never add deploy docs that imply Appwrite builds or serves this repo's frontend.
- **GitHub Actions deploy workflows** for this app's hosting — not used for Vercel; only `ci.yml` remains relevant from Actions (quality gates).

## Where to go next

- Full deployment workflow: [docs/deployment/](../docs/deployment/)
- Layers and modules: [Architecture](architecture.md)
- Stack summary: [Tech Stack](tech-stack.md)
