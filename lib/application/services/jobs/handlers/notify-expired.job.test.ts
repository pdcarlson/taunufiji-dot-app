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
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [
        {
          id: "task-1",
          title: "Kitchen",
          type: "duty",
          status: "expired",
          notification_level: "urgent",
          assigned_to: "user-1",
        },
      ] as any;
    });
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

  it("persists expired_admin when channel succeeds but DM fails, then completes on retry", async () => {
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [
        {
          id: "task-retry",
          title: "Stairs",
          type: "duty",
          status: "expired",
          notification_level: "urgent",
          assigned_to: "user-3",
        },
      ] as any;
    });
    taskRepository.update = vi.fn().mockResolvedValue({} as any);
    const notifyAdminsSpy = vi
      .spyOn(NotificationService, "notifyAdmins")
      .mockResolvedValue({ success: true });
    const dmSpy = vi
      .spyOn(NotificationService, "sendNotification")
      .mockResolvedValueOnce({ success: false, error: "dm down" });

    const first = await NotifyExpiredJob.run(taskRepository);

    expect(first.expired_notified).toBe(0);
    expect(first.errors).toHaveLength(1);
    expect(taskRepository.update).toHaveBeenCalledWith("task-retry", {
      notification_level: "expired_admin",
    });

    notifyAdminsSpy.mockClear();
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [
        {
          id: "task-retry",
          title: "Stairs",
          type: "duty",
          status: "expired",
          notification_level: "expired_admin",
          assigned_to: "user-3",
        },
      ] as any;
    });
    dmSpy.mockResolvedValueOnce({ success: true });

    const second = await NotifyExpiredJob.run(taskRepository);

    expect(second.expired_notified).toBe(1);
    expect(notifyAdminsSpy).not.toHaveBeenCalled();
    expect(taskRepository.update).toHaveBeenCalledWith("task-retry", {
      notification_level: "expired",
    });
  });

  it("does not send DM or mark complete when channel fails", async () => {
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [
        {
          id: "task-2",
          title: "Bathroom",
          type: "duty",
          status: "expired",
          notification_level: "urgent",
          assigned_to: "user-2",
        },
      ] as any;
    });
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
