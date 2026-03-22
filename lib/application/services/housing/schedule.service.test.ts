import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduleService } from "./schedule.service";
import { MockFactory } from "@/lib/test/mock-factory";

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
