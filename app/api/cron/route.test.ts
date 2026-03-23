import { describe, expect, it, vi } from "vitest";

type CronServiceMock = {
  runHourly: ReturnType<typeof vi.fn>;
  expireDuties: ReturnType<typeof vi.fn>;
  ensureFutureTasks: ReturnType<typeof vi.fn>;
};

type ContainerMock = {
  cronService: CronServiceMock;
};

type RouteFixtureOptions = {
  cronSecret?: string;
  runHourly?: () => Promise<unknown>;
  expireDuties?: () => Promise<unknown>;
  ensureFutureTasks?: () => Promise<unknown>;
};

async function loadRouteFixture(options: RouteFixtureOptions = {}) {
  const cronServiceMock: CronServiceMock = {
    runHourly: vi.fn(options.runHourly ?? (async () => ({ ok: true }))),
    expireDuties: vi.fn(options.expireDuties ?? (async () => ({ ok: true }))),
    ensureFutureTasks: vi.fn(
      options.ensureFutureTasks ?? (async () => ({ ok: true })),
    ),
  };

  vi.resetModules();

  vi.doMock("@/lib/infrastructure/config/env", () => ({
    env: {
      CRON_SECRET: options.cronSecret ?? "test-secret",
    },
  }));

  const containerMock: ContainerMock = { cronService: cronServiceMock };

  vi.doMock("@/lib/infrastructure/container", () => ({
    getContainer: () => containerMock,
  }));

  const routeModule = await import("./route");
  return { GET: routeModule.GET, cronServiceMock };
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

    const response = await GET(createRequest("HOURLY"));
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

    const response = await GET(createRequest("HOURLY", "invalid"));
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
    const { GET } = await loadRouteFixture();

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
  }, 15000);

  it("returns 500 when CRON_SECRET is not configured", async () => {
    const { GET } = await loadRouteFixture({ cronSecret: "" });

    const response = await GET(createRequest("HOURLY", "test-secret"));
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

  it("returns 200 and dispatches HOURLY job", async () => {
    const hourlyResult = { processed: 7, errors: [] };
    const { GET, cronServiceMock } = await loadRouteFixture({
      runHourly: async () => hourlyResult,
    });

    const response = await GET(createRequest("HOURLY", "test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(cronServiceMock.runHourly).toHaveBeenCalledTimes(1);
    expect(payload).toEqual({
      success: true,
      result: hourlyResult,
    });
  }, 15000);

  it("returns 500 when job execution throws", async () => {
    const { GET } = await loadRouteFixture({
      runHourly: async () => {
        throw new Error("explode");
      },
    });

    const response = await GET(createRequest("HOURLY", "test-secret"));
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
