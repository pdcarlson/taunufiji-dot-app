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

- Appwrite admin access to critical collections (`users`, `assignments`)
- Discord guild reachability with bot token
- Discord housing channel reachability
- Configured housing role IDs exist in the target guild

If this command fails, do not merge **`main` → `production`** (do not ship the Vercel Production deployment) until the failing checks are resolved. This script targets the same staging-oriented credentials as `npm run diagnose:staging` suggests—**`main`** is the integration branch; there is no separate “promote staging branch” step in the documented flow.

## Staging Troubleshooting Runbook

### Appwrite API hostname, TLS, and custom domains

**Invariant (production):** `NEXT_PUBLIC_APPWRITE_ENDPOINT` must stay on an **HTTPS hostname under the same chapter domain as the web app** (for example `https://appwrite.example.edu/v1` with `https://www.example.edu`). Do **not** change production to a regional Appwrite Cloud URL such as `https://REGION.cloud.appwrite.io/v1`; that makes the API a **third-party origin** and breaks first-party Appwrite session cookies. See [Environments: Appwrite API hostname](environments.md#appwrite-api-hostname-same-site-as-the-app).

**Vercel DNS vs Vercel TLS:** You can host **DNS** for `taunufiji.app` in Vercel and set `appwrite` → **CNAME** → `nyc.cloud.appwrite.io` (or whatever Appwrite shows). Browsers still fetch TLS from the **IP chain that CNAME resolves to** — Appwrite’s edge — so an **expired certificate** on `https://appwrite.taunufiji.app` is renewed in **Appwrite** for that custom domain, not by attaching the name to a Vercel project. Vercel’s domain checker may call that CNAME “misconfigured” because it expects Vercel hosting; that warning is **misleading** for an Appwrite-only API host.

**`NET::ERR_CERT_DATE_INVALID`:** The certificate presented on port 443 for that hostname is expired or not yet valid. Confirm with:

```bash
echo | openssl s_client -servername appwrite.example.com -connect appwrite.example.com:443 2>/dev/null \
  | openssl x509 -noout -dates -subject -issuer
```

**Appwrite Console: “Domain is already used”:** Appwrite already has that hostname attached somewhere (same project’s **Custom domains** list, another project, or another org). It is not the registrar blocking `taunufiji.app`. Find the existing attachment, renew SSL there, or ask Appwrite support to release a stuck domain record.

**Why not “just proxy Appwrite through Vercel”?** Terminating `https://appwrite.*` on Vercel and reverse-proxying to Appwrite would require a solution that supports **WebSocket upgrades** (Appwrite Realtime) and careful forwarding of cookies and hop-by-hop headers. Vercel’s simple external **rewrites** are not a drop-in replacement for the full Appwrite API surface. The supported pattern for this product remains **custom domain on Appwrite + CNAME in DNS**.

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
