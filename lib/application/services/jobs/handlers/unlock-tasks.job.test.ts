import { describe, expect, it, vi, beforeEach } from "vitest";
import { UnlockTasksJob } from "./unlock-tasks.job";
import { NotificationService } from "@/lib/application/services/shared/notification.service";
import { MockFactory } from "@/lib/test/mock-factory";
import type { HousingTask } from "@/lib/domain/types/task";

const lockedDutyBase: HousingTask = {
  id: "task-base",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  title: "T",
  description: "",
  status: "locked",
  type: "duty",
  points_value: 0,
  schedule_id: null,
  initial_image_s3_key: null,
  proof_s3_key: null,
  assigned_to: "user-1",
  due_at: null,
  expires_at: null,
  unlock_at: new Date(Date.now() - 60_000).toISOString(),
  is_fine: null,
  notification_level: "none",
  execution_limit: null,
  completed_at: null,
};

function lockedTask(overrides: Partial<HousingTask>): HousingTask {
  return { ...lockedDutyBase, ...overrides } as unknown as HousingTask;
}

describe("UnlockTasksJob", () => {
  const taskRepository = MockFactory.createTaskRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens task and marks unlocked when DM succeeds", async () => {
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [
        lockedTask({
          id: "task-1",
          title: "Kitchen",
          assigned_to: "user-1",
        }),
      ];
    });
    taskRepository.update = vi.fn().mockResolvedValue(lockedDutyBase);
    vi.spyOn(NotificationService, "sendNotification").mockResolvedValue({
      success: true,
    });

    const result = await UnlockTasksJob.run(taskRepository);

    expect(result.errors).toEqual([]);
    expect(result.unlocked).toBe(1);
    expect(taskRepository.update).toHaveBeenNthCalledWith(1, "task-1", {
      status: "open",
      notification_level: "none",
    });
    expect(taskRepository.update).toHaveBeenNthCalledWith(2, "task-1", {
      notification_level: "unlocked",
    });
  });

  it("keeps notification level retryable when DM fails", async () => {
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [
        lockedTask({
          id: "task-2",
          title: "Bathroom",
          assigned_to: "user-2",
        }),
      ];
    });
    taskRepository.update = vi.fn().mockResolvedValue(lockedDutyBase);
    vi.spyOn(NotificationService, "sendNotification").mockResolvedValue({
      success: false,
      error: "discord down",
    });

    const result = await UnlockTasksJob.run(taskRepository);

    expect(result.unlocked).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(taskRepository.update).toHaveBeenCalledTimes(1);
    expect(taskRepository.update).toHaveBeenCalledWith("task-2", {
      status: "open",
      notification_level: "none",
    });
  });
});
