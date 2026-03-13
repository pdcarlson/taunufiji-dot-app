import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const repository = {
    findActiveSchedules: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateSchedule: vi.fn(),
  };

  return { repository };
});

vi.mock("@/lib/infrastructure/persistence/task.repository", () => ({
  AppwriteTaskRepository: function () {
    return hoisted.repository;
  },
}));

import { ensureFutureTasksJob } from "./ensure-future-tasks.job";

describe("ensureFutureTasksJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips deactivated schedules to avoid resurrection", async () => {
    hoisted.repository.findActiveSchedules.mockResolvedValue([
      {
        id: "schedule-1",
        title: "Kitchen Duty",
        active: false,
        recurrence_rule: "7",
        lead_time_hours: 24,
      },
    ]);

    await ensureFutureTasksJob();

    expect(hoisted.repository.findMany).not.toHaveBeenCalled();
    expect(hoisted.repository.create).not.toHaveBeenCalled();
  });

  it("creates a task for active schedules missing future instances", async () => {
    hoisted.repository.findActiveSchedules.mockResolvedValue([
      {
        id: "schedule-2",
        title: "Chapter Room",
        description: "Clean chapter room",
        active: true,
        recurrence_rule: "7",
        lead_time_hours: 24,
        points_value: 0,
      },
    ]);
    hoisted.repository.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await ensureFutureTasksJob();

    expect(hoisted.repository.create).toHaveBeenCalledTimes(1);
    expect(hoisted.repository.updateSchedule).toHaveBeenCalledWith(
      "schedule-2",
      expect.objectContaining({
        last_generated_at: expect.any(String),
      }),
    );
  });
});
