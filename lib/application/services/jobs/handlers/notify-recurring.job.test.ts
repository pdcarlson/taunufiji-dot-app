import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotifyRecurringJob } from "./notify-recurring.job";
import { NotificationService } from "@/lib/application/services/shared/notification.service";
import { MockFactory } from "@/lib/test/mock-factory";
import type { HousingTask } from "@/lib/domain/types/task";

const dutyOpenBase: HousingTask = {
  id: "task-base",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  title: "T",
  description: "",
  status: "open",
  type: "duty",
  points_value: 0,
  schedule_id: "schedule-1",
  initial_image_s3_key: null,
  proof_s3_key: null,
  assigned_to: "user-1",
  due_at: null,
  expires_at: null,
  unlock_at: null,
  is_fine: null,
  notification_level: "none",
  execution_limit: null,
  completed_at: null,
};

function dutyTask(overrides: Partial<HousingTask>): HousingTask {
  return { ...dutyOpenBase, ...overrides } as unknown as HousingTask;
}

describe("NotifyRecurringJob", () => {
  const taskRepository = MockFactory.createTaskRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates notification level only after successful DM", async () => {
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [
        dutyTask({
          id: "task-1",
          title: "Kitchen",
          schedule_id: "schedule-1",
          assigned_to: "user-1",
        }),
      ];
    });
    taskRepository.update = vi.fn().mockResolvedValue(dutyOpenBase);
    vi.spyOn(NotificationService, "sendNotification").mockResolvedValue({
      success: true,
    });

    const result = await NotifyRecurringJob.run(taskRepository);

    expect(result.notified).toBe(1);
    expect(result.errors).toEqual([]);
    expect(taskRepository.update).toHaveBeenCalledWith("task-1", {
      notification_level: "unlocked",
    });
  });

  it("does not advance stage when DM fails", async () => {
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [
        dutyTask({
          id: "task-2",
          title: "Hallway",
          schedule_id: "schedule-2",
          assigned_to: "user-2",
        }),
      ];
    });
    taskRepository.update = vi.fn().mockResolvedValue(dutyOpenBase);
    vi.spyOn(NotificationService, "sendNotification").mockResolvedValue({
      success: false,
      error: "timeout",
    });

    const result = await NotifyRecurringJob.run(taskRepository);

    expect(result.notified).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(taskRepository.update).not.toHaveBeenCalled();
  });
});
