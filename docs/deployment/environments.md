# Environments

> **Parent specs:** [Platform](../../spec/platform.md) · [Architecture](../../spec/architecture.md)

## Staging Deployment (Preview)

**Trigger**: Push to **`main`** (usually via PR merge from a feature branch).

- **Vercel** builds and deploys **Preview** deployments from **`main`** (and from other branches as configured in the Vercel project).
- **Environment variables** for preview/staging behavior live in the **Vercel** project (Preview / custom environments), not in Appwrite Console for hosting.
- Use a **staging** Appwrite **project** (separate from production) for data and auth on the staging URL; point `NEXT_PUBLIC_APPWRITE_*` and `APPWRITE_API_KEY` at that project in the Vercel env for the preview/staging environment.
- Set `NODE_ENV=staging` (or equivalent) in Vercel for the staging/preview environment so the app title and metadata can show a `[STAGING]` prefix.

**Note**: Staging environment should be manually verified end-to-end before promoting to production. An end-to-end walkthrough (login, view dashboard, complete a housing duty) is recommended.

## Production Deployment

**Trigger**: Push to the **`production`** branch (per Vercel **Production Branch** setting for the project).

- **Vercel** builds and deploys **Production** from **`production`** when that branch is configured as the production branch in the Vercel Git integration.
- **Environment variables** for production are configured in **Vercel** (Production environment).
- **Appwrite production** credentials belong in Vercel Production env vars, not only in the Appwrite Console (the Console is where you create API keys; Vercel injects them at runtime).

## Secret Management

- **Local development**: `.env.local` file (not committed). Start from the repo root [`.env.example`](../../.env.example) (all keys with placeholders) and follow [`CONTRIBUTING.md`](../../CONTRIBUTING.md) (Local environment). Validation is defined in `serverEnvSchema` (`lib/infrastructure/config/server-env-schema.ts`).
- **Staging / production (runtime)**: Environment variables in **Vercel** per environment (Preview vs Production). Appwrite **API keys** are created in the **Appwrite Console** per Appwrite project, then stored as secrets in Vercel.
- **CI**: Minimal secrets in GitHub (only what quality gates need). Cron scheduling is **not** driven by GitHub; set `CRON_SECRET` in **Vercel** for runtime cron auth.

## Environment Matrix (Minimum Required)

| Concern         | Variables                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| App URL         | `NEXT_PUBLIC_APP_URL`                                                                                         |
| Appwrite        | `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY` — see [Appwrite API hostname](#appwrite-api-hostname-same-site-as-the-app) below |
| Discord Core    | `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_HOUSING_CHANNEL_ID` |
| Discord Roles   | `DISCORD_ROLE_ID_BROTHER`, `DISCORD_ROLE_ID_CABINET`, `DISCORD_ROLE_ID_HOUSING_CHAIR`                         |
| AWS/S3          | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME` (bucket must allow browser `PUT` from your app origins via CORS for Library uploads; see below) |
| Cron (optional) | `CRON_SECRET` — set when Vercel cron or authenticated `/api/cron` use is enabled                              |

**S3 CORS (Library browser uploads):** Presigned `PUT` requests originate from the browser. In the S3 bucket **Permissions → Cross-origin resource sharing (CORS)**, use rules that include your Vercel preview and production origins. Required elements for this app: **`AllowedMethods`** including `PUT`, **`AllowedHeaders`** including `Content-Type`, and **`ExposeHeaders`** including `ETag` (matches the signed request). Minimal example (replace origins with yours); full reference: [AWS S3 CORS configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html).

**Vercel previews:** Each preview deployment gets its own hostname, so you either list every preview URL you care about, or use a wildcard such as `https://*.vercel.app` (broader; use only if acceptable for your bucket). Replace `https://YOUR_VERCEL_PREVIEW_HOSTNAME` below with specific preview hostnames **or** that wildcard pattern.

```json
[
  {
    "AllowedOrigins": [
      "https://YOUR_VERCEL_PRODUCTION_HOSTNAME",
      "https://YOUR_VERCEL_PREVIEW_HOSTNAME",
      "http://127.0.0.1:REPLACE_WITH_DEV_PORT"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

In `serverEnvSchema` (`lib/infrastructure/config/server-env-schema.ts`), **`CRON_SECRET` is optional** (Zod `.optional()`). Omit it only when cron is disabled and nothing calls `/api/cron`; otherwise configure a non-empty secret in Vercel (and locally) so the endpoint can authorize requests.

`SKIP_ENV_VALIDATION=true` is intended for local fallback scenarios only when intentionally bypassing strict checks. CI should validate against a complete placeholder matrix, and runtime staging/production should validate with real environment values.

## Appwrite API hostname (same site as the app)

**Production and staging deployments:** `NEXT_PUBLIC_APPWRITE_ENDPOINT` must be **`https://<appwrite-subdomain>.<your-chapter-domain>/v1`** (or equivalent path) where the hostname is a **subdomain of the same registrable domain** as `NEXT_PUBLIC_APP_URL` (for example `appwrite.example.edu` with `https://www.example.edu`). This is a **product invariant**: switching production to a regional Appwrite Cloud URL such as `https://REGION.cloud.appwrite.io/v1` makes the API a **third-party** origin relative to the web app and breaks first-party cookie semantics for Appwrite sessions (and is unacceptable for this deployment model).

**DNS vs TLS:** You may manage DNS in **Vercel** (CNAME to the regional target Appwrite shows in the console, e.g. `nyc.cloud.appwrite.io`). That does **not** move TLS issuance to Vercel: the certificate the browser sees is still minted for traffic terminating on **Appwrite’s edge** until DNS is changed to route HTTPS to Vercel instead (which would stop being an Appwrite API endpoint).

**Appwrite Console “Domain is already used”:** That message means Appwrite already has that hostname registered somewhere in their cloud (often the **same project** under **Settings → Custom domains**, or another project or organization you own). It is **not** proof that Vercel “owns” the name at the DNS registrar. Fix: find which Appwrite project lists the domain and renew SSL there, remove the domain from the wrong project after migrating ownership, or contact **Appwrite support** to detach a stuck record. Adding the hostname under **Vercel → Project → Domains** alone does not replace Appwrite’s certificate while the CNAME still targets `*.cloud.appwrite.io`.

## Runtime Environment Checklist (Vercel)

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
- `CRON_SECRET` (when using Vercel cron or manual `/api/cron` invocations; optional in schema otherwise)

For production specifically, the three `DISCORD_ROLE_ID_*` keys must be present before deployment. Missing role IDs can break role-gated runtime flows even when unrelated routes (such as image proxying) build successfully.

## Appwrite: Extending `notification_level` (Housing)

The app may introduce new persisted values for `assignments.notification_level` (for example `expired_admin`).

1. **If the attribute is a string** in Appwrite (common): no schema migration is required; any new value the code writes is accepted.
2. **If the attribute is an enum**: add the new value to the enum in the Appwrite Console, or run:

   ```bash
   APPWRITE_TARGET_PROJECT_ID="<project id>" \
   APPWRITE_TARGET_API_KEY="<server API key with databases.write>" \
   npx tsx scripts/add-expired-admin-notification-enum.ts
   ```

   With no `APPWRITE_TARGET_*` overrides, the script uses `NEXT_PUBLIC_APPWRITE_PROJECT_ID` and `APPWRITE_STAGING_API_KEY` / `APPWRITE_API_KEY`. It reads the attribute type first; string attributes are a no-op.
