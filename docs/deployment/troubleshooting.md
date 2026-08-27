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

### Symptom: "Your connection is not private" / `NET::ERR_CERT_DATE_INVALID` on the Appwrite API host (e.g. `appwrite.example.com`)

The Next.js app on **Vercel** is separate from **Appwrite Cloud**. OAuth and the Appwrite web SDK use whatever host is in `NEXT_PUBLIC_APPWRITE_ENDPOINT`. If that host’s **TLS certificate is expired or not yet valid**, the browser blocks HTTPS before any application code runs.

**What `NET::ERR_CERT_DATE_INVALID` means:** the browser rejects the certificate’s validity window (usually **expired**).

**Who must issue the certificate (important):** TLS is terminated by whoever answers **HTTPS on the IPs your DNS resolves to**. If DNS is a **CNAME to** `*.cloud.appwrite.io`, the certificate you see in the browser is **Appwrite’s** (on their edge), not Vercel’s — even when **DNS records** are edited in **Vercel DNS** because the zone uses Vercel nameservers. Managing DNS in Vercel does **not** move TLS termination to Vercel unless you **change** that CNAME to point at Vercel (which would break the Appwrite API on that hostname).

**How to confirm from a shell (use your endpoint hostname, no `/v1` path):**

```bash
echo | openssl s_client -servername appwrite.example.com -connect appwrite.example.com:443 2>/dev/null \
  | openssl x509 -noout -dates -subject -issuer
```

**Typical causes after an Appwrite project pause:** automatic certificate renewal may not complete while the project is suspended; the cert can expire shortly after.

**What to do:**

1. **Appwrite Console** (not the registrar): Project → **Settings** → **Custom domains** for the hostname in `NEXT_PUBLIC_APPWRITE_ENDPOINT`. Use **Generate SSL certificate** / renew / re-verify if the UI offers it. You do **not** delegate the apex domain to Appwrite; you only register the hostname **inside** the Appwrite project and point **DNS** at their target (same pattern as [Appwrite custom domains](https://appwrite.io/docs/advanced/platform/custom-domains)).
2. Keep **DNS** aligned with that doc (usually a **CNAME** to your region’s `*.cloud.appwrite.io`). The Vercel “domain configuration” API may show **`misconfigured: true`** for such a CNAME because it assumes the hostname is for a Vercel deployment; ignore that for Appwrite-only hostnames.
3. **Server API keys** in this repo cannot renew certificates (they lack `projects.read` / domain scopes on the Appwrite API). Renewal is console-side or Appwrite support.
4. Run `npm run diagnose:staging` — it fails fast if the Appwrite endpoint certificate is expired or expiring within 14 days.

**Emergency workaround (cookie / third-party caveats):** point `NEXT_PUBLIC_APPWRITE_ENDPOINT` at your regional `https://<region>.cloud.appwrite.io/v1` in Vercel env and redeploy. Prefer fixing the custom domain when possible; see [Appwrite third-party cookies](https://appwrite.io/docs/advanced/platform/custom-domains#third-party-cookies) for why same-site API hostnames exist.

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
