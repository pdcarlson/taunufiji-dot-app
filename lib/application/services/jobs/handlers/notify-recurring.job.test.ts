import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotifyRecurringJob } from "./notify-recurring.job";
import { NotificationService } from "@/lib/application/services/shared/notification.service";
import { MockFactory } from "@/lib/test/mock-factory";

describe("NotifyRecurringJob", () => {
  const taskRepository = MockFactory.createTaskRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates notification level only after successful DM", async () => {
    taskRepository.findMany = vi.fn().mockResolvedValue([
      {
        id: "task-1",
        title: "Kitchen",
        status: "open",
        schedule_id: "schedule-1",
        notification_level: "none",
        assigned_to: "user-1",
      },
    ] as any);
    taskRepository.update = vi.fn().mockResolvedValue({} as any);
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
    taskRepository.findMany = vi.fn().mockResolvedValue([
      {
        id: "task-2",
        title: "Hallway",
        status: "open",
        schedule_id: "schedule-2",
        notification_level: "none",
        assigned_to: "user-2",
      },
    ] as any);
    taskRepository.update = vi.fn().mockResolvedValue({} as any);
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
