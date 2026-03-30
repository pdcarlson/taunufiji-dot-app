import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotifyExpiredJob } from "./notify-expired.job";
import { NotificationService } from "@/lib/application/services/shared/notification.service";
import { MockFactory } from "@/lib/test/mock-factory";
import type { HousingTask } from "@/lib/domain/types/task";

const expiredTaskBase: HousingTask = {
  id: "task-base",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  title: "T",
  description: "",
  status: "expired",
  type: "duty",
  points_value: 0,
  schedule_id: null,
  initial_image_s3_key: null,
  proof_s3_key: null,
  assigned_to: null,
  due_at: null,
  expires_at: null,
  unlock_at: null,
  is_fine: null,
  notification_level: "urgent",
  execution_limit: null,
  completed_at: null,
};

function expiredTaskFixture(overrides: Partial<HousingTask>): HousingTask {
  return { ...expiredTaskBase, ...overrides } as unknown as HousingTask;
}

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
        expiredTaskFixture({
          id: "task-1",
          title: "Kitchen",
          assigned_to: "user-1",
        }),
      ];
    });
    taskRepository.update = vi.fn().mockResolvedValue(expiredTaskBase);
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
        expiredTaskFixture({
          id: "task-retry",
          title: "Stairs",
          assigned_to: "user-3",
        }),
      ];
    });
    taskRepository.update = vi.fn().mockResolvedValue(expiredTaskBase);
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
        expiredTaskFixture({
          id: "task-retry",
          title: "Stairs",
          notification_level: "expired_admin",
          assigned_to: "user-3",
        }),
      ];
    });
    dmSpy.mockResolvedValueOnce({ success: true });

    const second = await NotifyExpiredJob.run(taskRepository);

    expect(second.expired_notified).toBe(1);
    expect(notifyAdminsSpy).not.toHaveBeenCalled();
    expect(taskRepository.update).toHaveBeenCalledWith("task-retry", {
      notification_level: "expired",
    });
  });

  it("skips missed-task channel/DM when expired row has proof (stale status) but marks notification complete", async () => {
    const notifyAdminsSpy = vi
      .spyOn(NotificationService, "notifyAdmins")
      .mockResolvedValue({ success: true });
    const dmSpy = vi
      .spyOn(NotificationService, "sendNotification")
      .mockResolvedValue({ success: true });
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [
        expiredTaskFixture({
          id: "task-proof",
          title: "Kitchen",
          assigned_to: "user-9",
          proof_s3_key: "s3/proof",
        }),
      ];
    });
    taskRepository.update = vi.fn().mockResolvedValue(expiredTaskBase);

    const result = await NotifyExpiredJob.run(taskRepository);

    expect(result.expired_notified).toBe(0);
    expect(result.errors).toEqual([]);
    expect(notifyAdminsSpy).not.toHaveBeenCalled();
    expect(dmSpy).not.toHaveBeenCalled();
    expect(taskRepository.update).toHaveBeenCalledWith("task-proof", {
      notification_level: "expired",
    });
  });

  it("does not send DM or mark complete when channel fails", async () => {
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [
        expiredTaskFixture({
          id: "task-2",
          title: "Bathroom",
          assigned_to: "user-2",
        }),
      ];
    });
    taskRepository.update = vi.fn().mockResolvedValue(expiredTaskBase);
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
