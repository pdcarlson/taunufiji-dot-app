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
    const row = expiredTaskFixture({
      id: "task-1",
      title: "Kitchen",
      assigned_to: "user-1",
    });
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [row];
    });
    taskRepository.findById = vi.fn().mockResolvedValue(row);
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
    const rowFirst = expiredTaskFixture({
      id: "task-retry",
      title: "Stairs",
      assigned_to: "user-3",
    });
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [rowFirst];
    });
    taskRepository.findById = vi.fn().mockResolvedValue(rowFirst);
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
    const rowSecond = expiredTaskFixture({
      id: "task-retry",
      title: "Stairs",
      notification_level: "expired_admin",
      assigned_to: "user-3",
    });
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [rowSecond];
    });
    taskRepository.findById = vi.fn().mockResolvedValue(rowSecond);
    dmSpy.mockResolvedValueOnce({ success: true });

    const second = await NotifyExpiredJob.run(taskRepository);

    expect(second.expired_notified).toBe(1);
    expect(notifyAdminsSpy).not.toHaveBeenCalled();
    expect(taskRepository.update).toHaveBeenCalledWith("task-retry", {
      notification_level: "expired",
    });
  });

  it("does not send DM or mark complete when channel fails", async () => {
    const row = expiredTaskFixture({
      id: "task-2",
      title: "Bathroom",
      assigned_to: "user-2",
    });
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [row];
    });
    taskRepository.findById = vi.fn().mockResolvedValue(row);
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

  it("silences missed-task ping when re-fetch shows task was approved", async () => {
    const staleRow = expiredTaskFixture({
      id: "task-fixed",
      title: "Kitchen",
      assigned_to: "user-x",
    });
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [staleRow];
    });
    taskRepository.findById = vi.fn().mockResolvedValue(
      expiredTaskFixture({
        id: "task-fixed",
        title: "Kitchen",
        status: "approved",
        assigned_to: "user-x",
        proof_s3_key: "proof/key",
      }),
    );
    taskRepository.update = vi.fn().mockResolvedValue(expiredTaskBase);
    const notifyAdminsSpy = vi
      .spyOn(NotificationService, "notifyAdmins")
      .mockResolvedValue({ success: true });
    const dmSpy = vi
      .spyOn(NotificationService, "sendNotification")
      .mockResolvedValue({ success: true });

    const result = await NotifyExpiredJob.run(taskRepository);

    expect(result.expired_notified).toBe(0);
    expect(notifyAdminsSpy).not.toHaveBeenCalled();
    expect(dmSpy).not.toHaveBeenCalled();
    expect(taskRepository.update).not.toHaveBeenCalled();
  });

  it("silences missed-task ping when re-fetch shows pending with proof", async () => {
    const staleRow = expiredTaskFixture({
      id: "task-under-review",
      title: "Hall",
      assigned_to: "user-y",
    });
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [staleRow];
    });
    taskRepository.findById = vi.fn().mockResolvedValue(
      expiredTaskFixture({
        id: "task-under-review",
        title: "Hall",
        status: "pending",
        assigned_to: "user-y",
        proof_s3_key: "proof/after",
      }),
    );
    taskRepository.update = vi.fn().mockResolvedValue(expiredTaskBase);
    const notifyAdminsSpy = vi
      .spyOn(NotificationService, "notifyAdmins")
      .mockResolvedValue({ success: true });
    const dmSpy = vi
      .spyOn(NotificationService, "sendNotification")
      .mockResolvedValue({ success: true });

    const result = await NotifyExpiredJob.run(taskRepository);

    expect(result.expired_notified).toBe(0);
    expect(notifyAdminsSpy).not.toHaveBeenCalled();
    expect(dmSpy).not.toHaveBeenCalled();
    expect(taskRepository.update).not.toHaveBeenCalled();
  });

  it("does not send DM when task disappears after admin channel step", async () => {
    const row = expiredTaskFixture({
      id: "task-vanish",
      title: "Attic",
      assigned_to: "user-v",
    });
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [row];
    });
    let findByIdCalls = 0;
    taskRepository.findById = vi.fn().mockImplementation(async () => {
      findByIdCalls++;
      if (findByIdCalls === 1) {
        return row;
      }
      return null;
    });
    taskRepository.update = vi.fn().mockResolvedValue(expiredTaskBase);
    vi.spyOn(NotificationService, "notifyAdmins").mockResolvedValue({
      success: true,
    });
    const dmSpy = vi
      .spyOn(NotificationService, "sendNotification")
      .mockResolvedValue({ success: true });

    const result = await NotifyExpiredJob.run(taskRepository);

    expect(result.expired_notified).toBe(0);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/task task-vanish missing after admin channel step/),
      ]),
    );
    expect(dmSpy).not.toHaveBeenCalled();
  });

  it("does not send duplicate DM when re-fetch shows notification_level already expired", async () => {
    const staleRow = expiredTaskFixture({
      id: "task-done",
      title: "Basement",
      assigned_to: "user-z",
      notification_level: "expired_admin",
    });
    const freshRow = expiredTaskFixture({
      id: "task-done",
      title: "Basement",
      assigned_to: "user-z",
      notification_level: "expired",
    });
    taskRepository.findMany = vi.fn().mockImplementation(async (opts) => {
      const offset = opts.offset ?? 0;
      if (offset > 0) return [];
      return [staleRow];
    });
    taskRepository.findById = vi.fn().mockResolvedValue(freshRow);
    taskRepository.update = vi.fn().mockResolvedValue(expiredTaskBase);
    const notifyAdminsSpy = vi
      .spyOn(NotificationService, "notifyAdmins")
      .mockResolvedValue({ success: true });
    const dmSpy = vi
      .spyOn(NotificationService, "sendNotification")
      .mockResolvedValue({ success: true });

    const result = await NotifyExpiredJob.run(taskRepository);

    expect(result.expired_notified).toBe(0);
    expect(notifyAdminsSpy).not.toHaveBeenCalled();
    expect(dmSpy).not.toHaveBeenCalled();
    expect(taskRepository.update).not.toHaveBeenCalled();
  });
});
