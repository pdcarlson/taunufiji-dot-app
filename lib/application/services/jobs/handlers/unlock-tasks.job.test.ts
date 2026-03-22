import { describe, expect, it, vi, beforeEach } from "vitest";
import { UnlockTasksJob } from "./unlock-tasks.job";
import { NotificationService } from "@/lib/application/services/shared/notification.service";
import { MockFactory } from "@/lib/test/mock-factory";

describe("UnlockTasksJob", () => {
  const taskRepository = MockFactory.createTaskRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens task and marks unlocked when DM succeeds", async () => {
    taskRepository.findMany = vi.fn().mockResolvedValue([
      {
        id: "task-1",
        title: "Kitchen",
        status: "locked",
        unlock_at: new Date(Date.now() - 60_000).toISOString(),
        assigned_to: "user-1",
      },
    ] as any);
    taskRepository.update = vi.fn().mockResolvedValue({} as any);
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
    taskRepository.findMany = vi.fn().mockResolvedValue([
      {
        id: "task-2",
        title: "Bathroom",
        status: "locked",
        unlock_at: new Date(Date.now() - 60_000).toISOString(),
        assigned_to: "user-2",
      },
    ] as any);
    taskRepository.update = vi.fn().mockResolvedValue({} as any);
    vi.spyOn(NotificationService, "sendNotification").mockResolvedValue({
      success: false,
      error: "discord down",
    });

    const result = await UnlockTasksJob.run(taskRepository);

    expect(result.unlocked).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(taskRepository.update).toHaveBeenCalledTimes(1);
    expect(taskRepository.update).toHaveBeenCalledWith("task-2", {
      status: "open",
      notification_level: "none",
    });
  });
});
