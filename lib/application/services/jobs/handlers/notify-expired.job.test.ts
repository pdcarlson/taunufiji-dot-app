import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotifyExpiredJob } from "./notify-expired.job";
import { NotificationService } from "@/lib/application/services/shared/notification.service";
import { MockFactory } from "@/lib/test/mock-factory";

describe("NotifyExpiredJob", () => {
  const taskRepository = MockFactory.createTaskRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks expired notification only when channel and DM both succeed", async () => {
    taskRepository.findMany = vi.fn().mockResolvedValue([
      {
        id: "task-1",
        title: "Kitchen",
        type: "duty",
        status: "expired",
        notification_level: "urgent",
        assigned_to: "user-1",
      },
    ] as any);
    taskRepository.update = vi.fn().mockResolvedValue({} as any);
    vi.spyOn(NotificationService, "notifyAdmins").mockResolvedValue({
      success: true,
    });
    vi.spyOn(NotificationService, "sendNotification").mockResolvedValue({
      success: true,
    });

    const result = await NotifyExpiredJob.run(taskRepository);

    expect(result.expired_notified).toBe(1);
    expect(result.errors).toEqual([]);
    expect(taskRepository.update).toHaveBeenCalledWith("task-1", {
      notification_level: "expired",
    });
  });

  it("does not send DM or mark complete when channel fails", async () => {
    taskRepository.findMany = vi.fn().mockResolvedValue([
      {
        id: "task-2",
        title: "Bathroom",
        type: "duty",
        status: "expired",
        notification_level: "urgent",
        assigned_to: "user-2",
      },
    ] as any);
    taskRepository.update = vi.fn().mockResolvedValue({} as any);
    vi.spyOn(NotificationService, "notifyAdmins").mockResolvedValue({
      success: false,
      error: "channel missing",
    });
    const dmSpy = vi
      .spyOn(NotificationService, "sendNotification")
      .mockResolvedValue({ success: true });

    const result = await NotifyExpiredJob.run(taskRepository);

    expect(result.expired_notified).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(dmSpy).not.toHaveBeenCalled();
    expect(taskRepository.update).not.toHaveBeenCalled();
  });
});
