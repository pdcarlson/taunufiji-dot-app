# Troubleshooting

> **Parent specs:** [Platform](../../spec/platform.md) · [Behavior](../../spec/behavior.md)

## Staging Runtime Diagnostics

The script loads `.env.local` when present (same staging keys as the app: Appwrite, AWS placeholders if required by schema, Discord bot + guild + housing channel + `DISCORD_ROLE_ID_*` role IDs). It validates env with `serverEnvSchema` before running checks.

From the repo root:

```bash
npm run diagnose:staging
```

Exit code `0` prints a line per check with pass/fail; exit code `1` if validation fails or any check fails.

What it verifies today:

- TLS certificate validity for the Appwrite endpoint host (catches expired certs that break Discord OAuth in the browser)
- Appwrite admin access to critical collections (`users`, `assignments`)
- Discord guild reachability with bot token
- Discord housing channel reachability
- Configured housing role IDs exist in the target guild

If this command fails, do not merge **`main` → `production`** (do not ship the Vercel Production deployment) until the failing checks are resolved. This script targets the same staging-oriented credentials as `npm run diagnose:staging` suggests—**`main`** is the integration branch; there is no separate “promote staging branch” step in the documented flow.

## Staging Troubleshooting Runbook

### Symptom: "Your connection is not private" / `NET::ERR_CERT_DATE_INVALID` on the Appwrite host (e.g. `appwrite.example.com`)

The Next.js app on **Vercel** is separate from **Appwrite Cloud**. OAuth and the Appwrite web SDK talk to whatever host is in `NEXT_PUBLIC_APPWRITE_ENDPOINT`. If that host’s **TLS certificate is expired or not yet valid**, the browser blocks the connection before any application code runs — login with Discord fails with a certificate warning.

**What `NET::ERR_CERT_DATE_INVALID` means:** the browser does not trust the server’s certificate dates (usually **expired**, occasionally clock skew on the client).

**How to confirm from a shell (replace the host with your endpoint hostname, no `/v1` path):**

```bash
echo | openssl s_client -servername appwrite.example.com -connect appwrite.example.com:443 2>/dev/null \
  | openssl x509 -noout -dates -subject
```

**Typical causes after an Appwrite project pause:** automatic certificate renewal (ACME) may not run while the project is suspended; the cert can expire shortly after.

**What to do:**

1. In **Appwrite Console** → your project → **Settings** (or **Domains** / custom hostname): open the **custom domain** used in `NEXT_PUBLIC_APPWRITE_ENDPOINT`, ensure it is **verified**, and use any **renew / refresh certificate** option if shown. Re-saving or toggling verification can trigger a new cert.
2. Ensure **DNS** for that hostname still matches Appwrite’s documented target (usually a **CNAME** to your region’s `*.cloud.appwrite.io`). This hostname is **not** a Vercel project domain — the Vercel “domain configuration” checker may label a CNAME to Appwrite as “misconfigured” because it expects Vercel’s own records; that warning does **not** apply to traffic that should terminate on Appwrite.
3. Run `npm run diagnose:staging` — it fails fast if the Appwrite endpoint certificate is expired or expiring within 14 days.

### Symptom: Deploy succeeds but first request is slow or times out

This is often **cold start** or heavy SSR on the first hit after idle.

1. **Confirm the Vercel deployment build** succeeded: Vercel dashboard → **Deployments** → open the deployment → **Build Logs**.
2. **Warm the runtime** after deploy: hit a **static** URL first (served from the edge without running the full app), e.g. `https://<your-host>/health.txt`, then load `/login` or the dashboard. **`/` is not a good probe**—it redirects and pulls in heavier server work.
3. Use **Vercel** request / function logs for the deployment to see slow routes or errors.

### Symptom: "Failed to assign duty" / task creation fails

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

### Symptom: Cron request fails with `curl` errors or HTTP `4xx` / `5xx`

1. Run a preflight request against the deployment you are debugging (from a local shell):

   ```bash
   BASE_URL="<app-url>"
   CRON_SECRET="<cron-secret-for-that-deployment>"
   curl --silent --show-error \
     -w '\n%{http_code}\n' \
     -H "Authorization: Bearer ${CRON_SECRET}" \
     "${BASE_URL%/}/api/cron"
   ```

   The response body is printed first; the **last line** is the numeric HTTP status (for example `400`, `401`, or `500`).

2. Interpret preflight status before running `job=HOUSING_BATCH`:
   - When the server returns `400` and the body has `error.code` **`INVALID_JOB`** with `error.details.reason` **`INVALID_JOB_PARAMETER`** (preflight with no `job` query param), auth and runtime cron config are aligned (safe to run the housing batch).
   - If you receive `401` with `UNAUTHORIZED`, the bearer value does not match deployed runtime `CRON_SECRET` (header must be exactly `Authorization: Bearer <CRON_SECRET>` per [Vercel cron docs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)).
   - When `500` shows `CRON_SECRET_MISSING` in `error.details.reason` (response `error.code` is `SERVER_CONFIG_ERROR`), the deployed runtime is missing `CRON_SECRET` in the hosting environment.
   - When `500` indicates `JOB_EXECUTION_FAILED`, runtime dependencies failed during execution; inspect app logs.
3. In **Vercel** for the target deployment environment (Preview/staging or Production), verify `CRON_SECRET` is present and non-empty and `NEXT_PUBLIC_APP_URL` matches the deployed site URL for that environment.
4. **Redeploy** after changing environment variables if the platform does not hot-reload them for existing deployments (Vercel typically requires a new deployment for env changes to take effect).
5. To run the housing scheduled batch manually against a URL you control:

   ```bash
   curl --silent --show-error -X GET \
     -H "Authorization: Bearer ${CRON_SECRET}" \
     "${BASE_URL%/}/api/cron?job=HOUSING_BATCH"
   ```

6. Confirm endpoint auth contract is Bearer header (`Authorization: Bearer <CRON_SECRET>`), not query-string `key`.
