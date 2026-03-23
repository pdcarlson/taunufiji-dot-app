import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { ensureFutureTasksJob } from "./ensure-future-tasks.job";
import { MockFactory } from "@/lib/test/mock-factory";

describe("ensureFutureTasksJob", () => {
  let taskRepository: ReturnType<typeof MockFactory.createTaskRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    taskRepository = MockFactory.createTaskRepository();
  });

  it("skips deactivated schedules to avoid resurrection", async () => {
    (taskRepository.findActiveSchedules as Mock).mockResolvedValue([
      {
        id: "schedule-1",
        title: "Kitchen Duty",
        active: false,
        recurrence_rule: "7",
        lead_time_hours: 24,
      },
    ]);

    await ensureFutureTasksJob(taskRepository);

    expect(taskRepository.findMany).not.toHaveBeenCalled();
    expect(taskRepository.create).not.toHaveBeenCalled();
  });

  it("creates a task for active schedules missing future instances", async () => {
    (taskRepository.findActiveSchedules as Mock).mockResolvedValue([
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
    (taskRepository.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await ensureFutureTasksJob(taskRepository);

    expect(taskRepository.create).toHaveBeenCalledTimes(1);
    expect(taskRepository.updateSchedule).toHaveBeenCalledWith(
      "schedule-2",
      expect.objectContaining({
        last_generated_at: expect.any(String),
      }),
    );
  });

  it("does not create when repository.findMany returns existing future instances", async () => {
    (taskRepository.findActiveSchedules as Mock).mockResolvedValue([
      {
        id: "schedule-3",
        title: "Bathroom",
        active: true,
        recurrence_rule: "7",
        lead_time_hours: 24,
      },
    ]);
    (taskRepository.findMany as Mock).mockResolvedValue([
      { id: "task-1", schedule_id: "schedule-3", status: "open" },
    ]);

    await ensureFutureTasksJob(taskRepository);

    expect(taskRepository.findMany).toHaveBeenCalled();
    expect(taskRepository.create).not.toHaveBeenCalled();
    expect(taskRepository.updateSchedule).not.toHaveBeenCalled();
  });

  it("surfaces error when repository.create rejects", async () => {
    (taskRepository.findActiveSchedules as Mock).mockResolvedValue([
      {
        id: "schedule-4",
        title: "Hallway",
        active: true,
        recurrence_rule: "7",
        lead_time_hours: 24,
      },
    ]);
    (taskRepository.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (taskRepository.create as Mock).mockRejectedValue(new Error("db fail"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await ensureFutureTasksJob(taskRepository);

    expect(taskRepository.create).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "🔥 EnsureFutureTasksJob Failed:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("processes multiple active schedules and invokes create/updateSchedule per schedule", async () => {
    (taskRepository.findActiveSchedules as Mock).mockResolvedValue([
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
    (taskRepository.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (taskRepository.create as Mock).mockResolvedValue(undefined);
    (taskRepository.updateSchedule as Mock).mockResolvedValue(undefined);

    await ensureFutureTasksJob(taskRepository);

    expect(taskRepository.create).toHaveBeenCalledTimes(2);
    expect(taskRepository.updateSchedule).toHaveBeenCalledTimes(2);
    expect(taskRepository.updateSchedule).toHaveBeenCalledWith(
      "schedule-a",
      expect.objectContaining({ last_generated_at: expect.any(String) }),
    );
    expect(taskRepository.updateSchedule).toHaveBeenCalledWith(
      "schedule-b",
      expect.objectContaining({ last_generated_at: expect.any(String) }),
    );
  });
});
