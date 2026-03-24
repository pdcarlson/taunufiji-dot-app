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

export const CRON_JOBS = {
  HOUSING_BATCH: "HOUSING_BATCH",
  EXPIRE_DUTIES: "EXPIRE_DUTIES",
  ENSURE_FUTURE_TASKS: "ENSURE_FUTURE_TASKS",
} as const;

type CronJobName = (typeof CRON_JOBS)[keyof typeof CRON_JOBS];

/** Narrow cron surface for `/api/cron`; `Promise<unknown>` so production `CronService` and Vitest mocks both assign. */
export type CronServicePort = {
  runHousingScheduledBatch: () => Promise<unknown>;
  expireDuties: () => Promise<unknown>;
  ensureFutureTasks: () => Promise<unknown>;
};

const JOB_HANDLERS: Record<
  CronJobName,
  (cronService: CronServicePort) => Promise<unknown>
> = {
  [CRON_JOBS.HOUSING_BATCH]: (cronService) =>
    cronService.runHousingScheduledBatch(),
  [CRON_JOBS.EXPIRE_DUTIES]: (cronService) => cronService.expireDuties(),
  [CRON_JOBS.ENSURE_FUTURE_TASKS]: (cronService) =>
    cronService.ensureFutureTasks(),
};

function isAllowedCronJob(job: string): job is CronJobName {
  return Object.prototype.hasOwnProperty.call(JOB_HANDLERS, job);
}

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

export type CronGetHandlerDeps = {
  cronService: CronServicePort;
  cronSecret: string | undefined;
};

/** Factory for tests and alternate wiring; production uses {@link GET}. */
export function createCronGetHandler(deps: CronGetHandlerDeps) {
  return async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const job = searchParams.get("job");

    try {
      const CRON_SECRET = deps.cronSecret;

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

      if (!job || !isAllowedCronJob(job)) {
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

      const runJob = JOB_HANDLERS[job];
      const result = await runJob(deps.cronService);

      console.log("[cron] Job completed", {
        job,
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
  };
}

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
    cronService: getContainer().cronService,
    cronSecret: env.CRON_SECRET,
  })(req);
}
