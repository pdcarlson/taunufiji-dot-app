# Cron Jobs

> **Parent specs:** [Behavior](../../spec/behavior.md) · [Platform](../../spec/platform.md)

## Configuration

- **Scheduler**: [Vercel Cron](https://vercel.com/docs/cron-jobs) via root `vercel.json`: GET `/api/cron?job=HOUSING_BATCH` **once per day** at **`0 18 * * *`** (minute `0` of hour `18`, every day, **UTC**).
  - **Hobby plan**: Vercel allows at most one invocation per day for cron; the expression must not run more frequently than daily.
  - **Hobby timing**: Invocations are distributed within the scheduled **hour** (roughly any time from `18:00:00` through `18:59:59` UTC), not necessarily on the minute — see [Cron jobs accuracy](https://vercel.com/docs/cron-jobs/manage-cron-jobs#cron-jobs-accuracy).
  - **Why 18:00 UTC**: Duties go overdue at **midnight Eastern**. A **mid-afternoon** run aligns the housing batch (including **urgent**, sub-12-hour notifications) with the **same calendar day** before duties are due that night. **Note:** cron expressions are **UTC-only**. `18:00` UTC is **1:00 PM Eastern Standard Time** and **2:00 PM Eastern Daylight Time**; during EDT the same UTC hour corresponds to **2:00–2:59 PM** local on the **same** Eastern calendar day.

## Target Deployment

Per Vercel's documentation, cron invokes the project's **production deployment URL** only — preview deployments are not targeted by scheduled cron.

## Housing Batch Pipeline

**`job=HOUSING_BATCH`**: Full housing time-driven pipeline (unlock, notify, urgent window, expire, fine retries, expired notify, ensure future). On Hobby this is invoked **once per day** by Vercel; the handler is idempotent enough for occasional manual re-runs if needed.

The pipeline steps (in order) are documented in [spec/behavior.md § Scheduled housing batch](../../spec/behavior.md#scheduled-housing-batch-overdue-duties-fines-and-ledger).

## Authentication

Set `CRON_SECRET` on the Vercel project; Vercel sends it as `Authorization: Bearer <CRON_SECRET>` when invoking the route. The handler compares the header to `Bearer ${CRON_SECRET}` as in Vercel's recommended pattern. Do not pass the secret as a query parameter.

## Manual / Local Testing

Hit the route with curl (the deployment URL in a browser will not send the secret — use curl). Vercel attaches `vercel-cron/1.0` as the user agent for platform-triggered runs.

```bash
BASE_URL="<app-url>"
CRON_SECRET="<cron-secret-for-that-deployment>"
curl --silent --show-error -X GET \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${BASE_URL%/}/api/cron?job=HOUSING_BATCH"
```

For troubleshooting cron failures, see [Troubleshooting](troubleshooting.md#symptom-cron-request-fails-with-curl-errors-or-http-4xx--5xx).
