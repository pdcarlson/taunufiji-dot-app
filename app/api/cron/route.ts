import { CronResult } from "@/lib/application/services/jobs/cron.service";
import { getContainer } from "@/lib/infrastructure/container";
import { env } from "@/lib/infrastructure/config/env";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // ensure no caching

const ERROR_CODES = {
  serverConfig: "SERVER_CONFIG_ERROR",
  unauthorized: "UNAUTHORIZED",
  invalidJob: "INVALID_JOB",
  jobExecutionFailed: "JOB_EXECUTION_FAILED",
} as const;

const CRON_JOBS = {
  HOUSING_BATCH: "HOUSING_BATCH",
  EXPIRE_DUTIES: "EXPIRE_DUTIES",
  ENSURE_FUTURE_TASKS: "ENSURE_FUTURE_TASKS",
} as const;

const ALLOWED_JOBS = Object.values(CRON_JOBS);

type CronErrorDetails = {
  category: "CONFIGURATION" | "AUTH" | "VALIDATION" | "EXECUTION";
  reason:
    | "CRON_SECRET_MISSING"
    | "AUTH_TOKEN_INVALID"
    | "INVALID_JOB_PARAMETER"
    | "JOB_THROWN_ERROR";
};

function createErrorResponse(
  status: number,
  code: string,
  message: string,
  job: string | null,
  details?: CronErrorDetails,
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, job, details },
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
      console.error("[cron] Server configuration error", {
        code: ERROR_CODES.serverConfig,
        reason: "CRON_SECRET_MISSING",
      });
      return createErrorResponse(
        500,
        ERROR_CODES.serverConfig,
        "Server configuration error",
        job,
        {
          category: "CONFIGURATION",
          reason: "CRON_SECRET_MISSING",
        },
      );
    }

    // Vercel Cron sends CRON_SECRET as Authorization: Bearer <value> (exact match; see Vercel cron docs).
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      console.error("[cron] Unauthorized request", {
        code: ERROR_CODES.unauthorized,
        reason: "AUTH_TOKEN_INVALID",
        job,
      });
      return createErrorResponse(
        401,
        ERROR_CODES.unauthorized,
        "Unauthorized",
        job,
        {
          category: "AUTH",
          reason: "AUTH_TOKEN_INVALID",
        },
      );
    }

    if (
      job !== CRON_JOBS.HOUSING_BATCH &&
      job !== CRON_JOBS.EXPIRE_DUTIES &&
      job !== CRON_JOBS.ENSURE_FUTURE_TASKS
    ) {
      console.error("[cron] Invalid job parameter", { job });
      return createErrorResponse(
        400,
        ERROR_CODES.invalidJob,
        "Invalid or missing job parameter",
        job,
        {
          category: "VALIDATION",
          reason: "INVALID_JOB_PARAMETER",
        },
      );
    }

    let result: CronResult | { errors: string[] } | void;

    const { cronService } = getContainer();

    switch (job) {
      case CRON_JOBS.HOUSING_BATCH:
        result = await cronService.runHousingScheduledBatch();
        break;
      case CRON_JOBS.EXPIRE_DUTIES:
        result = await cronService.expireDuties();
        break;
      case CRON_JOBS.ENSURE_FUTURE_TASKS:
        result = await cronService.ensureFutureTasks();
        break;
    }

    console.log("[cron] Job completed", {
      job,
      allowedJobs: ALLOWED_JOBS,
      hasResult: result !== undefined,
      resultType: typeof result,
      completedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[cron] Job failed", {
      code: ERROR_CODES.jobExecutionFailed,
      reason: "JOB_THROWN_ERROR",
      job,
      message,
    });
    return createErrorResponse(
      500,
      ERROR_CODES.jobExecutionFailed,
      "Internal server error",
      job,
      {
        category: "EXECUTION",
        reason: "JOB_THROWN_ERROR",
      },
    );
  }
}
