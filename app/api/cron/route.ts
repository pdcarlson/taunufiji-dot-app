import { createCronGetHandler } from "@/app/api/cron/cron-get-handler";
import { env } from "@/lib/infrastructure/config/env";
import { getContainer } from "@/lib/infrastructure/container";

export const dynamic = "force-dynamic"; // ensure no caching

/**
 * GET `/api/cron` — runs a named scheduled job with bearer auth.
 *
 * - **Query `job`:** `HOUSING_BATCH`, `EXPIRE_DUTIES`, or `ENSURE_FUTURE_TASKS`.
 * - **Header:** `Authorization` must be exactly `Bearer <CRON_SECRET>` (same value as server `CRON_SECRET`). If `CRON_SECRET` is unset, responds **500**.
 * - **200** — `{ success: true, result }`
 * - **400** — missing or unknown `job`
 * - **401** — missing or invalid bearer token
 * - **500** — configuration error or uncaught handler failure
 */
export async function GET(req: Request) {
  return createCronGetHandler({
    cronSecret: env.CRON_SECRET,
    resolveCronService: () => getContainer().cronService,
  })(req);
}
