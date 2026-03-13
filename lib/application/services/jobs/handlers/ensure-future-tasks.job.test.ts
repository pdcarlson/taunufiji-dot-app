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

  it("does not create when repository.findMany returns existing future instances", async () => {
    hoisted.repository.findActiveSchedules.mockResolvedValue([
      {
        id: "schedule-3",
        title: "Bathroom",
        active: true,
        recurrence_rule: "7",
        lead_time_hours: 24,
      },
    ]);
    hoisted.repository.findMany.mockResolvedValue([
      { id: "task-1", schedule_id: "schedule-3", status: "open" },
    ]);

    await ensureFutureTasksJob();

    expect(hoisted.repository.findMany).toHaveBeenCalled();
    expect(hoisted.repository.create).not.toHaveBeenCalled();
    expect(hoisted.repository.updateSchedule).not.toHaveBeenCalled();
  });

  it("surfaces error when repository.create rejects", async () => {
    hoisted.repository.findActiveSchedules.mockResolvedValue([
      {
        id: "schedule-4",
        title: "Hallway",
        active: true,
        recurrence_rule: "7",
        lead_time_hours: 24,
      },
    ]);
    hoisted.repository.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    hoisted.repository.create.mockRejectedValue(new Error("db fail"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await ensureFutureTasksJob();

    expect(hoisted.repository.create).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "🔥 EnsureFutureTasksJob Failed:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("processes multiple active schedules and invokes create/updateSchedule per schedule", async () => {
    hoisted.repository.findActiveSchedules.mockResolvedValue([
      {
        id: "schedule-a",
        title: "Room A",
        active: true,
        recurrence_rule: "7",
        lead_time_hours: 24,
      },
      {
        id: "schedule-b",
        title: "Room B",
        active: true,
        recurrence_rule: "7",
        lead_time_hours: 24,
      },
    ]);
    hoisted.repository.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    hoisted.repository.create.mockResolvedValue(undefined);
    hoisted.repository.updateSchedule.mockResolvedValue(undefined);

    await ensureFutureTasksJob();

    expect(hoisted.repository.create).toHaveBeenCalledTimes(2);
    expect(hoisted.repository.updateSchedule).toHaveBeenCalledTimes(2);
    expect(hoisted.repository.updateSchedule).toHaveBeenCalledWith(
      "schedule-a",
      expect.objectContaining({ last_generated_at: expect.any(String) }),
    );
    expect(hoisted.repository.updateSchedule).toHaveBeenCalledWith(
      "schedule-b",
      expect.objectContaining({ last_generated_at: expect.any(String) }),
    );
  });
});
