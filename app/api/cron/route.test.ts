import { describe, expect, it, vi } from "vitest";
import type { CronServicePort } from "./route";

type RouteFixtureOptions = {
  cronSecret?: string;
  runHousingScheduledBatch?: () => Promise<unknown>;
  expireDuties?: () => Promise<unknown>;
  ensureFutureTasks?: () => Promise<unknown>;
};

async function loadRouteFixture(options: RouteFixtureOptions = {}) {
  const cronServiceMock: CronServicePort = {
    runHousingScheduledBatch: vi.fn(
      options.runHousingScheduledBatch ?? (async () => ({ ok: true })),
    ),
    expireDuties: vi.fn(options.expireDuties ?? (async () => ({ ok: true }))),
    ensureFutureTasks: vi.fn(
      options.ensureFutureTasks ?? (async () => ({ ok: true })),
    ),
  };

  vi.resetModules();

  const { createCronGetHandler } = await import("./route");
  const GET = createCronGetHandler({
    cronService: cronServiceMock,
    cronSecret: options.cronSecret ?? "test-secret",
  });

  return { GET, cronServiceMock };
}

function createRequest(job?: string, authToken?: string) {
  const url = job
    ? `https://example.com/api/cron?job=${job}`
    : "https://example.com/api/cron";
  const headers = new Headers();

  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  return new Request(url, { method: "GET", headers });
}

describe("GET /api/cron", () => {
  it("returns 401 when bearer token is missing", async () => {
    const { GET } = await loadRouteFixture();

    const response = await GET(createRequest("HOUSING_BATCH"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        details: {
          category: "AUTH",
          reason: "AUTH_TOKEN_INVALID",
        },
      },
    });
  }, 15000);

  it("returns 401 when bearer token is invalid", async () => {
    const { GET } = await loadRouteFixture();

    const response = await GET(createRequest("HOUSING_BATCH", "invalid"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        details: {
          category: "AUTH",
          reason: "AUTH_TOKEN_INVALID",
        },
      },
    });
  }, 15000);

  it("returns 401 when Authorization is not exactly Bearer <CRON_SECRET> (Vercel cron contract)", async () => {
    const { GET } = await loadRouteFixture();

    const url = "https://example.com/api/cron?job=HOUSING_BATCH";
    const headers = new Headers();
    headers.set("Authorization", "Bearer  test-secret");

    const response = await GET(new Request(url, { method: "GET", headers }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        details: { category: "AUTH", reason: "AUTH_TOKEN_INVALID" },
      },
    });
  }, 15000);

  it("returns 400 when job parameter is missing", async () => {
    const { GET } = await loadRouteFixture();

    const response = await GET(createRequest(undefined, "test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "INVALID_JOB",
        details: {
          category: "VALIDATION",
          reason: "INVALID_JOB_PARAMETER",
        },
      },
    });
  }, 15000);

  it("returns 400 when job parameter is invalid", async () => {
    const { GET, cronServiceMock } = await loadRouteFixture();

    const response = await GET(createRequest("NOT_A_REAL_JOB", "test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "INVALID_JOB",
        details: {
          category: "VALIDATION",
          reason: "INVALID_JOB_PARAMETER",
        },
      },
    });
    expect(cronServiceMock.runHousingScheduledBatch).not.toHaveBeenCalled();
    expect(cronServiceMock.expireDuties).not.toHaveBeenCalled();
    expect(cronServiceMock.ensureFutureTasks).not.toHaveBeenCalled();
  }, 15000);

  it("returns 400 when job is constructor (no inherited key bypass)", async () => {
    const { GET, cronServiceMock } = await loadRouteFixture();

    const response = await GET(createRequest("constructor", "test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      error: { code: "INVALID_JOB" },
    });
    expect(cronServiceMock.runHousingScheduledBatch).not.toHaveBeenCalled();
    expect(cronServiceMock.expireDuties).not.toHaveBeenCalled();
    expect(cronServiceMock.ensureFutureTasks).not.toHaveBeenCalled();
  }, 15000);

  it("returns 400 when job is toString (no inherited key bypass)", async () => {
    const { GET, cronServiceMock } = await loadRouteFixture();

    const response = await GET(createRequest("toString", "test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      error: { code: "INVALID_JOB" },
    });
    expect(cronServiceMock.runHousingScheduledBatch).not.toHaveBeenCalled();
    expect(cronServiceMock.expireDuties).not.toHaveBeenCalled();
    expect(cronServiceMock.ensureFutureTasks).not.toHaveBeenCalled();
  }, 15000);

  it("returns 500 when CRON_SECRET is not configured", async () => {
    const { GET } = await loadRouteFixture({ cronSecret: "" });

    const response = await GET(createRequest("HOUSING_BATCH", "test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "SERVER_CONFIG_ERROR",
        details: {
          category: "CONFIGURATION",
          reason: "CRON_SECRET_MISSING",
        },
      },
    });
  }, 15000);

  it("returns 200 and dispatches HOUSING_BATCH job", async () => {
    const batchResult = { processed: 7, errors: [] };
    const { GET, cronServiceMock } = await loadRouteFixture({
      runHousingScheduledBatch: async () => batchResult,
    });

    const response = await GET(createRequest("HOUSING_BATCH", "test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(cronServiceMock.runHousingScheduledBatch).toHaveBeenCalledTimes(1);
    expect(payload).toEqual({
      success: true,
      result: batchResult,
    });
  }, 15000);

  it("returns 200 and dispatches EXPIRE_DUTIES job", async () => {
    const batchResult = { expired: 3, errors: [] as string[] };
    const { GET, cronServiceMock } = await loadRouteFixture({
      expireDuties: async () => batchResult,
    });

    const response = await GET(createRequest("EXPIRE_DUTIES", "test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(cronServiceMock.expireDuties).toHaveBeenCalledTimes(1);
    expect(payload).toEqual({
      success: true,
      result: batchResult,
    });
  }, 15000);

  it("returns 200 and dispatches ENSURE_FUTURE_TASKS job", async () => {
    const batchResult = { ensured: 2 };
    const { GET, cronServiceMock } = await loadRouteFixture({
      ensureFutureTasks: async () => batchResult,
    });

    const response = await GET(
      createRequest("ENSURE_FUTURE_TASKS", "test-secret"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(cronServiceMock.ensureFutureTasks).toHaveBeenCalledTimes(1);
    expect(payload).toEqual({
      success: true,
      result: batchResult,
    });
  }, 15000);

  it("returns 500 when job execution throws", async () => {
    const { GET } = await loadRouteFixture({
      runHousingScheduledBatch: async () => {
        throw new Error("explode");
      },
    });

    const response = await GET(createRequest("HOUSING_BATCH", "test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      success: false,
      error: {
        code: "JOB_EXECUTION_FAILED",
        message: "Internal server error",
        details: {
          category: "EXECUTION",
          reason: "JOB_THROWN_ERROR",
        },
      },
    });
  }, 15000);
});
