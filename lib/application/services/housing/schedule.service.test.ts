import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduleService } from "./schedule.service";
import { MockFactory } from "@/lib/test/mock-factory";

function baseTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    schedule_id: "schedule-1",
    title: "Old",
    description: "d",
    points_value: 5,
    assigned_to: "user-a",
    due_at: "2026-03-10T12:00:00.000Z",
    unlock_at: "2026-03-09T12:00:00.000Z",
    status: "open",
    notification_level: "unlocked",
    type: "duty",
    ...overrides,
  } as any;
}

describe("ScheduleService updateTaskThisAndFuture", () => {
  const taskRepository = MockFactory.createTaskRepository();
  const service = new ScheduleService(taskRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates housing_schedules before housing_assignments so cron cannot emit stale schedule rows mid-mutation", async () => {
    const task = baseTask();
    const futureTask = {
      ...baseTask({
        id: "task-2",
        due_at: "2026-03-17T12:00:00.000Z",
        unlock_at: "2026-03-16T12:00:00.000Z",
      }),
    };

    taskRepository.findScheduleById = vi.fn().mockResolvedValue({
      id: "schedule-1",
      title: "Old",
      description: "d",
      points_value: 5,
      assigned_to: "user-a",
      lead_time_hours: 24,
    } as any);
    taskRepository.findMany = vi
      .fn()
      .mockResolvedValueOnce([task, futureTask] as any)
      .mockResolvedValueOnce([] as any);
    taskRepository.updateSchedule = vi.fn().mockResolvedValue({} as any);
    taskRepository.update = vi.fn().mockImplementation(async (id: string, patch: any) => {
      if (id === "task-1") {
        return { ...task, ...patch };
      }
      return { ...futureTask, ...patch };
    });
    taskRepository.findById = vi.fn().mockResolvedValue({
      ...task,
      title: "New",
    } as any);

    await service.updateTaskThisAndFuture(
      task,
      { title: "New" },
      "2026-03-10T12:00:00.000Z",
    );

    const scheduleOrder = (taskRepository.updateSchedule as any).mock
      .invocationCallOrder[0];
    const firstUpdateOrder = (taskRepository.update as any).mock
      .invocationCallOrder[0];
    expect(scheduleOrder).toBeLessThan(firstUpdateOrder);
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

    taskRepository.findScheduleById = vi.fn().mockResolvedValue({
      id: "schedule-1",
      lead_time_hours: 24,
    } as any);
    taskRepository.findMany = vi
      .fn()
      .mockResolvedValueOnce([task, futureTask] as any)
      .mockResolvedValueOnce([] as any);
    taskRepository.updateSchedule = vi.fn().mockResolvedValue({} as any);
    taskRepository.update = vi.fn().mockResolvedValue({} as any);
    taskRepository.findById = vi.fn().mockResolvedValue(task as any);

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
    const task2Call = (taskRepository.update as any).mock.calls.find(
      (c: unknown[]) => c[0] === "task-2",
    );
    expect(task2Call[1]).toMatchObject({
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
    taskRepository.updateSchedule = vi.fn().mockResolvedValue({} as any);
    taskRepository.findMany = vi
      .fn()
      .mockResolvedValueOnce([
        task,
        { ...task, id: "task-2", due_at: "2026-03-17T12:00:00.000Z" },
      ] as any)
      .mockResolvedValueOnce([] as any);
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
    const scheduleOrder = (taskRepository.updateSchedule as any).mock
      .invocationCallOrder[0];
    const firstDeleteOrder = (taskRepository.delete as any).mock
      .invocationCallOrder[0];
    expect(scheduleOrder).toBeLessThan(firstDeleteOrder);
    expect(taskRepository.delete).not.toHaveBeenCalledWith("task-1");
  });

  it("deletes peer rows and current task when all deletes succeed", async () => {
    const task = baseTask();
    taskRepository.updateSchedule = vi.fn().mockResolvedValue({} as any);
    taskRepository.findMany = vi
      .fn()
      .mockResolvedValueOnce([
        task,
        { ...task, id: "task-2" },
      ] as any)
      .mockResolvedValueOnce([] as any);
    taskRepository.delete = vi.fn().mockResolvedValue(undefined);

    await service.deleteTaskEntireSeries(task, undefined);

    const deleteMock = taskRepository.delete as ReturnType<typeof vi.fn>;
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
    const task = {
      id: "task-1",
      schedule_id: "schedule-1",
      due_at: "2026-03-10T03:59:00.000Z",
    } as any;

    taskRepository.findScheduleById = vi.fn().mockResolvedValue({
      id: "schedule-1",
      active: true,
    } as any);
    taskRepository.updateSchedule = vi.fn().mockResolvedValue({} as any);
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
      ] as any)
      .mockResolvedValueOnce([] as any);
    taskRepository.delete = vi.fn().mockResolvedValue(undefined);

    await service.deleteTaskThisAndFuture(task, "2026-03-10T03:59:00.000Z");

    expect(taskRepository.updateSchedule).toHaveBeenCalledWith("schedule-1", {
      active: false,
      last_generated_at: expect.any(String),
    });
    expect(taskRepository.delete).toHaveBeenCalledWith("task-1");
    expect(taskRepository.delete).toHaveBeenCalledWith("task-2");

    const updateScheduleOrder = (taskRepository.updateSchedule as any).mock
      .invocationCallOrder[0];
    const firstDeleteOrder = (taskRepository.delete as any).mock
      .invocationCallOrder[0];
    expect(updateScheduleOrder).toBeLessThan(firstDeleteOrder);
  });
});
