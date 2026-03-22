import { describe, expect, it, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({
  unlockRun: vi.fn(),
  recurringRun: vi.fn(),
  urgentRun: vi.fn(),
  expireRun: vi.fn(),
  notifyExpiredRun: vi.fn(),
  ensureFutureRun: vi.fn(),
}));

vi.mock("./handlers/unlock-tasks.job", () => ({
  UnlockTasksJob: { run: hoisted.unlockRun },
}));

vi.mock("./handlers/notify-recurring.job", () => ({
  NotifyRecurringJob: { run: hoisted.recurringRun },
}));

vi.mock("./handlers/notify-urgent.job", () => ({
  NotifyUrgentJob: { run: hoisted.urgentRun },
}));

vi.mock("./handlers/expire-duties.job", () => ({
  expireDutiesJob: hoisted.expireRun,
}));

vi.mock("./handlers/notify-expired.job", () => ({
  NotifyExpiredJob: { run: hoisted.notifyExpiredRun },
}));

vi.mock("./handlers/ensure-future-tasks.job", () => ({
  ensureFutureTasksJob: hoisted.ensureFutureRun,
}));

vi.mock("@/lib/infrastructure/container", () => ({
  getContainer: () => ({
    taskRepository: { id: "repo" },
    pointsService: {},
    scheduleService: {},
  }),
}));

import { HousingTimeDrivenPipeline } from "./housing-time-driven.pipeline";

describe("HousingTimeDrivenPipeline.runFullHourlyCycle", () => {
  const taskRepository = { id: "repo" } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.unlockRun.mockResolvedValue({ unlocked: 1, errors: [] });
    hoisted.recurringRun.mockResolvedValue({ notified: 1, errors: [] });
    hoisted.urgentRun.mockResolvedValue({ urgent: 1, errors: [] });
    hoisted.expireRun.mockResolvedValue({ errors: [] });
    hoisted.notifyExpiredRun.mockResolvedValue({
      expired_notified: 1,
      skipped_unassigned: 0,
      errors: [],
    });
    hoisted.ensureFutureRun.mockResolvedValue(undefined);
  });

  it("runs steps in order and aggregates counters", async () => {
    const result = await HousingTimeDrivenPipeline.runFullHourlyCycle(
      taskRepository,
    );

    expect(result).toEqual({
      unlocked: 2,
      urgent: 1,
      expired_notified: 1,
      skipped_unassigned: 0,
      errors: [],
    });

    const order = [
      hoisted.unlockRun.mock.invocationCallOrder[0],
      hoisted.recurringRun.mock.invocationCallOrder[0],
      hoisted.urgentRun.mock.invocationCallOrder[0],
      hoisted.expireRun.mock.invocationCallOrder[0],
      hoisted.notifyExpiredRun.mock.invocationCallOrder[0],
      hoisted.ensureFutureRun.mock.invocationCallOrder[0],
    ];
    const sorted = [...order].sort((a, b) => a - b);
    expect(order).toEqual(sorted);
  });
});
