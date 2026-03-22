import { describe, expect, it, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => {
  return {
    taskRepository: {},
    unlockRun: vi.fn(),
    recurringRun: vi.fn(),
    urgentRun: vi.fn(),
    expireRun: vi.fn(),
    notifyExpiredRun: vi.fn(),
    ensureFutureRun: vi.fn(),
  };
});

vi.mock("@/lib/infrastructure/container", () => ({
  getContainer: () => ({
    taskRepository: hoisted.taskRepository,
  }),
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

import { CronService } from "./cron.service";

describe("CronService.runHourly", () => {
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

  it("runs hourly pipeline in order and returns aggregated stats", async () => {
    const result = await CronService.runHourly();

    expect(result).toEqual({
      unlocked: 2,
      urgent: 1,
      expired_notified: 1,
      skipped_unassigned: 0,
      errors: [],
    });
    expect(hoisted.unlockRun).toHaveBeenCalledWith(hoisted.taskRepository);
    expect(hoisted.recurringRun).toHaveBeenCalledWith(hoisted.taskRepository);
    expect(hoisted.urgentRun).toHaveBeenCalledWith(hoisted.taskRepository);
    expect(hoisted.notifyExpiredRun).toHaveBeenCalledWith(
      hoisted.taskRepository,
    );
    expect(hoisted.ensureFutureRun).toHaveBeenCalledTimes(1);
  });
});
