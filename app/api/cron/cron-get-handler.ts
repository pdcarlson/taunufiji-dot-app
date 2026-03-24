import { NextResponse } from "next/server";

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

const ERROR_CODES = {
  serverConfig: "SERVER_CONFIG_ERROR",
  unauthorized: "UNAUTHORIZED",
  invalidJob: "INVALID_JOB",
  jobExecutionFailed: "JOB_EXECUTION_FAILED",
} as const;

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

/**
 * Dependencies for {@link createCronGetHandler}. Keeps the HTTP handler testable and lets production
 * defer `getContainer()` until after auth/validation so DI wiring errors still return the JSON error shape.
 *
 * Pass `cronService` in tests (or when wiring manually). Pass `resolveCronService` in production so
 * container construction runs inside the handler `try` and cannot bypass `createErrorResponse`.
 * `cronSecret` may be undefined in misconfigured or local environments; the handler responds 500 in that case.
 */
export type CronGetHandlerDeps =
  | {
      cronSecret: string | undefined;
      cronService: CronServicePort;
    }
  | {
      cronSecret: string | undefined;
      resolveCronService: () => CronServicePort;
    };

/** Factory for tests and alternate wiring; production {@link GET} lives in `route.ts`. */
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

      const cronService =
        "resolveCronService" in deps
          ? deps.resolveCronService()
          : deps.cronService;

      const runJob = JOB_HANDLERS[job];
      const result = await runJob(cronService);

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
