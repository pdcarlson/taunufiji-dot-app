import {
  CronService,
  CronResult,
} from "@/lib/application/services/jobs/cron.service";
import { env } from "@/lib/infrastructure/config/env";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // ensure no caching
const CRON_JOBS = {
  HOURLY: "HOURLY",
  EXPIRE_DUTIES: "EXPIRE_DUTIES",
  ENSURE_FUTURE_TASKS: "ENSURE_FUTURE_TASKS",
} as const;

function createErrorResponse(
  status: number,
  code: string,
  message: string,
  job: string | null,
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, job },
    },
    { status },
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const job = searchParams.get("job");

  try {
    // Bearer-token auth keeps this endpoint restricted to trusted schedulers.
    const CRON_SECRET = env.CRON_SECRET;

    if (!CRON_SECRET) {
      console.error("[cron] Server configuration error: CRON_SECRET missing");
      return createErrorResponse(
        500,
        "SERVER_CONFIG_ERROR",
        "Server configuration error",
        job,
      );
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
    if (!token || token !== CRON_SECRET) {
      console.error("[cron] Unauthorized request", { job });
      return createErrorResponse(401, "UNAUTHORIZED", "Unauthorized", job);
    }

    let result: CronResult | { errors: string[] } | void;

    switch (job) {
      case CRON_JOBS.HOURLY:
        result = await CronService.runHourly();
        break;
      case CRON_JOBS.EXPIRE_DUTIES:
        result = await CronService.expireDuties();
        break;
      case CRON_JOBS.ENSURE_FUTURE_TASKS:
        result = await CronService.ensureFutureTasks();
        break;
      default:
        console.error("[cron] Invalid job parameter", { job });
        return createErrorResponse(
          400,
          "INVALID_JOB",
          "Invalid or missing job parameter",
          job,
        );
    }

    console.log("[cron] Job completed", {
      job,
      result: JSON.stringify(result),
    });

    return NextResponse.json({ success: true, result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[cron] Job failed", { job, message, error: e });
    return createErrorResponse(500, "JOB_EXECUTION_FAILED", message, job);
  }
}
