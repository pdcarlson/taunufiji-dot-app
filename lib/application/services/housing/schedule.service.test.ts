import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { ScheduleService } from "./schedule.service";
import { MockFactory } from "@/lib/test/mock-factory";
import type { HousingTask } from "@/lib/domain/types/task";
import type { HousingSchedule } from "@/lib/domain/types/schedule";

function baseTask(overrides: Partial<HousingTask> = {}): HousingTask {
  return {
    id: "task-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    title: "Old",
    description: "d",
    points_value: 5,
    assigned_to: "user-a",
    due_at: "2026-03-10T12:00:00.000Z",
    unlock_at: "2026-03-09T12:00:00.000Z",
    status: "open",
    notification_level: "unlocked",
    type: "duty",
    schedule_id: "schedule-1",
    initial_image_s3_key: null,
    proof_s3_key: null,
    expires_at: null,
    is_fine: null,
    execution_limit: null,
    completed_at: null,
    ...overrides,
  };
}

describe("ScheduleService updateTaskThisAndFuture", () => {
  const taskRepository = MockFactory.createTaskRepository();
  const service = new ScheduleService(taskRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates housing_schedules before housing_assignments so cron cannot emit stale schedule rows mid-mutation", async () => {
    const task = baseTask();
    const futureTask = baseTask({
      id: "task-2",
      due_at: "2026-03-17T12:00:00.000Z",
      unlock_at: "2026-03-16T12:00:00.000Z",
    });

    const scheduleRow: HousingSchedule = {
      id: "schedule-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      title: "Old",
      description: "d",
      recurrence_rule: "7",
      points_value: 5,
      assigned_to: "user-a",
      active: true,
      last_generated_at: null,
      lead_time_hours: 24,
    };

    taskRepository.findScheduleById = vi.fn().mockResolvedValue(scheduleRow);
    taskRepository.findMany = vi
      .fn()
      .mockResolvedValueOnce([task, futureTask])
      .mockResolvedValueOnce([]);
    taskRepository.updateSchedule = vi.fn().mockResolvedValue(scheduleRow);
    taskRepository.update = vi
      .fn()
      .mockImplementation(async (id: string, patch: Partial<HousingTask>) => {
        if (id === "task-1") {
          return { ...task, ...patch };
        }
        return { ...futureTask, ...patch };
      });
    taskRepository.findById = vi.fn().mockResolvedValue({
      ...task,
      title: "New",
    });

    await service.updateTaskThisAndFuture(
      task,
      { title: "New" },
      "2026-03-10T12:00:00.000Z",
    );

    const updateScheduleMock = taskRepository.updateSchedule as Mock;
    const updateMock = taskRepository.update as Mock;
    expect(updateScheduleMock.mock.invocationCallOrder[0]).toBeLessThan(
      updateMock.mock.invocationCallOrder[0],
    );
    expect(taskRepository.updateSchedule).toHaveBeenCalledWith(
      "schedule-1",
      expect.objectContaining({
        title: "New",
        last_generated_at: expect.any(String),
      }),
    );
  });

  it("merges scheduleLeadTimeHours into schedule and open/locked rows for this_and_future", async () => {
    const task = baseTask({ status: "open" });
    const futureTask = baseTask({
      id: "task-2",
      due_at: "2026-03-17T12:00:00.000Z",
      status: "open",
    });

    const scheduleRow: Pick<
      HousingSchedule,
      "id" | "lead_time_hours"
    > = {
      id: "schedule-1",
      lead_time_hours: 24,
    };

    taskRepository.findScheduleById = vi
      .fn()
      .mockResolvedValue(scheduleRow as HousingSchedule);
    taskRepository.findMany = vi
      .fn()
      .mockResolvedValueOnce([task, futureTask])
      .mockResolvedValueOnce([]);
    taskRepository.updateSchedule = vi.fn().mockResolvedValue(scheduleRow);
    taskRepository.update = vi.fn().mockResolvedValue(task);
    taskRepository.findById = vi.fn().mockResolvedValue(task);

    await service.updateTaskThisAndFuture(
      task,
      { title: "T" },
      "2026-03-10T12:00:00.000Z",
      { scope: "this_and_future", scheduleLeadTimeHours: 48 },
    );

    expect(taskRepository.updateSchedule).toHaveBeenCalledWith(
      "schedule-1",
      expect.objectContaining({
        title: "T",
        lead_time_hours: 48,
      }),
    );
    const updateMock = taskRepository.update as Mock;
    const task2Call = updateMock.mock.calls.find((c: unknown[]) => c[0] === "task-2");
    expect(task2Call?.[1]).toMatchObject({
      title: "T",
      unlock_at: expect.any(String),
    });
  });
});

describe("ScheduleService deleteTaskEntireSeries", () => {
  const taskRepository = MockFactory.createTaskRepository();
  const service = new ScheduleService(taskRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deactivates schedule before deletes and throws if a delete fails (no silent partial success)", async () => {
    const task = baseTask();
    taskRepository.updateSchedule = vi.fn().mockResolvedValue(undefined);
    taskRepository.findMany = vi
      .fn()
      .mockResolvedValueOnce([
        task,
        baseTask({
          id: "task-2",
          due_at: "2026-03-17T12:00:00.000Z",
        }),
      ])
      .mockResolvedValueOnce([]);
    taskRepository.delete = vi
      .fn()
      .mockRejectedValue(new Error("appwrite delete failed"));

    await expect(
      service.deleteTaskEntireSeries(task, undefined),
    ).rejects.toThrow(/Series deactivated but one or more task rows failed/);

    expect(taskRepository.updateSchedule).toHaveBeenCalledWith(
      "schedule-1",
      expect.objectContaining({ active: false }),
    );
    const updateScheduleMock = taskRepository.updateSchedule as Mock;
    const deleteMock = taskRepository.delete as Mock;
    expect(updateScheduleMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteMock.mock.invocationCallOrder[0],
    );
    expect(taskRepository.delete).not.toHaveBeenCalledWith("task-1");
  });

  it("rejects when peer deletes succeed but current task delete fails after schedule deactivated", async () => {
    const task = baseTask();
    const peer = baseTask({ id: "task-2" });
    taskRepository.updateSchedule = vi.fn().mockResolvedValue(undefined);
    taskRepository.findMany = vi
      .fn()
      .mockResolvedValueOnce([peer, task])
      .mockResolvedValueOnce([]);
    taskRepository.delete = vi.fn().mockImplementation((id: string) => {
      if (id === "task-2") {
        return Promise.resolve();
      }
      if (id === "task-1") {
        return Promise.reject(new Error("delete current failed"));
      }
      return Promise.resolve();
    });

    await expect(
      service.deleteTaskEntireSeries(task, undefined),
    ).rejects.toThrow(
      /Series deactivated but the current task row failed to delete/,
    );

    const updateScheduleMock = taskRepository.updateSchedule as Mock;
    const deleteMock = taskRepository.delete as Mock;
    expect(updateScheduleMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteMock.mock.invocationCallOrder[0],
    );
    expect(taskRepository.delete).toHaveBeenCalledWith("task-2");
    expect(taskRepository.delete).toHaveBeenCalledWith("task-1");
  });

  it("deletes peer rows and current task when all deletes succeed", async () => {
    const task = baseTask();
    taskRepository.updateSchedule = vi.fn().mockResolvedValue(undefined);
    taskRepository.findMany = vi
      .fn()
      .mockResolvedValueOnce([task, baseTask({ id: "task-2" })])
      .mockResolvedValueOnce([]);
    taskRepository.delete = vi.fn().mockResolvedValue(undefined);

    await service.deleteTaskEntireSeries(task, undefined);

    const deleteMock = taskRepository.delete as Mock;
    expect(deleteMock).toHaveBeenCalledTimes(2);
    expect(deleteMock.mock.calls[0][0]).toBe("task-2");
    expect(deleteMock.mock.calls[1][0]).toBe("task-1");
  });
});

describe("ScheduleService deleteTaskThisAndFuture", () => {
  const taskRepository = MockFactory.createTaskRepository();
  const service = new ScheduleService(taskRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deactivates schedule before deleting rows to avoid cron resurrection", async () => {
    const task: Pick<HousingTask, "id" | "schedule_id" | "due_at"> = {
      id: "task-1",
      schedule_id: "schedule-1",
      due_at: "2026-03-10T03:59:00.000Z",
    };

    taskRepository.findScheduleById = vi.fn().mockResolvedValue({
      id: "schedule-1",
      active: true,
    } as HousingSchedule);
    taskRepository.updateSchedule = vi.fn().mockResolvedValue(undefined);
    taskRepository.findMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "task-1",
          due_at: "2026-03-10T03:59:00.000Z",
          status: "open",
        },
        {
          id: "task-2",
          due_at: "2026-03-17T03:59:00.000Z",
          status: "open",
        },
      ] as unknown as HousingTask[])
      .mockResolvedValueOnce([]);
    taskRepository.delete = vi.fn().mockResolvedValue(undefined);

    await service.deleteTaskThisAndFuture(task as HousingTask, "2026-03-10T03:59:00.000Z");

    expect(taskRepository.updateSchedule).toHaveBeenCalledWith("schedule-1", {
      active: false,
      last_generated_at: expect.any(String),
    });
    expect(taskRepository.delete).toHaveBeenCalledWith("task-1");
    expect(taskRepository.delete).toHaveBeenCalledWith("task-2");

    const updateScheduleMock = taskRepository.updateSchedule as Mock;
    const deleteMock = taskRepository.delete as Mock;
    expect(updateScheduleMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteMock.mock.invocationCallOrder[0],
    );
  });
});
