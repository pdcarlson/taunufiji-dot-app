import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminService } from "./admin.service";
import { MockFactory } from "@/lib/test/mock-factory";
import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";

import { TaskEvents } from "@/lib/domain/events";

// Mock dependencies
const mockTaskRepo = MockFactory.createTaskRepository();
// Partial mock for ScheduleService as it's complex
const mockScheduleService = {
  triggerNextInstance: vi.fn(),
} as any;

// Mock Event Bus
vi.mock("@/lib/infrastructure/events/dispatcher", () => ({
  DomainEventBus: {
    publish: vi.fn(),
  },
}));

describe("AdminService", () => {
  let service: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    (DomainEventBus.publish as any).mockResolvedValue(undefined);
    service = new AdminService(mockTaskRepo, mockScheduleService);
  });

  describe("verifyTask", () => {
    it("should approve a pending task and set completed_at", async () => {
      const taskId = "task-123";

      // Mock findById to return a pending task
      (mockTaskRepo.findById as any).mockResolvedValue({
        id: taskId,
        title: "Test Task",
        status: "pending",
        type: "duty",
        points_value: 10,
        assigned_to: "user-1",
        // ... other mandatory fields
        description: "desc",
        createdAt: "now",
        updatedAt: "now",
      } as any);

      // Execute
      await service.verifyTask(taskId, "admin-1");

      // Verify Update was called with completed_at
      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({
          status: "approved",
          completed_at: expect.any(String), // Verify string date is passed
        }),
      );

      expect(DomainEventBus.publish).toHaveBeenCalledWith(
        TaskEvents.TASK_APPROVED,
        expect.objectContaining({
          taskId: taskId,
          title: "Test Task",
          userId: "user-1",
          points: 10,
        }),
      );
    });

    it("should throw error if task is not pending", async () => {
      (mockTaskRepo.findById as any).mockResolvedValue({
        id: "task-open",
        status: "open",
      } as any);

      await expect(service.verifyTask("task-open", "admin-1")).rejects.toThrow(
        "Task is not pending approval.",
      );
    });

    it("should rollback status and throw if EventBus fails", async () => {
      const taskId = "task-fail";
      (mockTaskRepo.findById as any).mockResolvedValue({
        id: taskId,
        title: "Fail Task",
        status: "pending",
        points_value: 10,
        assigned_to: "user-1",
      } as any);

      // Mock EventBus failure
      (DomainEventBus.publish as any).mockRejectedValue(
        new Error("Event Error"),
      );

      await expect(service.verifyTask(taskId, "admin-1")).rejects.toThrow(
        "Failed to complete approval process: Event Error",
      );

      // Verify Rollback
      expect(mockTaskRepo.update).toHaveBeenCalledTimes(2); // 1. approve, 2. rollback/pending
      expect(mockTaskRepo.update).toHaveBeenLastCalledWith(
        taskId,
        expect.objectContaining({
          status: "pending",
          completed_at: null,
        }),
      );
    });
    it("should use overridePoints if provided", async () => {
      const taskId = "task-override";
      (mockTaskRepo.findById as any).mockResolvedValue({
        id: taskId,
        title: "Override Task",
        status: "pending",
        points_value: 10,
        assigned_to: "user-1",
      } as any);

      await service.verifyTask(taskId, "admin-1", 20);

      // Verify update called with new points
      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({
          status: "approved",
          points_value: 20,
        }),
      );

      // Verify Event published with new points
      expect(DomainEventBus.publish).toHaveBeenCalledWith(
        TaskEvents.TASK_APPROVED,
        expect.objectContaining({
          points: 20,
        }),
      );
    });
  });
  describe("rejectTask", () => {
    it("should delete ad-hoc tasks upon rejection", async () => {
      const taskId = "adhoc-1";
      (mockTaskRepo.findById as any).mockResolvedValue({
        id: taskId,
        type: "ad_hoc",
        assigned_to: "user-1",
        title: "Extra Work",
      } as any);

      await service.rejectTask(taskId, "Not needed");

      expect(mockTaskRepo.delete).toHaveBeenCalledWith(taskId);
      expect(mockTaskRepo.update).not.toHaveBeenCalled(); // Should NOT update status
      expect(DomainEventBus.publish).toHaveBeenCalledWith(
        TaskEvents.TASK_REJECTED,
        expect.objectContaining({ taskId }),
      );
    });

    it("should update status for normal tasks upon rejection", async () => {
      const taskId = "duty-1";
      (mockTaskRepo.findById as any).mockResolvedValue({
        id: taskId,
        type: "duty",
        assigned_to: "user-1",
        title: "Clean",
      } as any);

      await service.rejectTask(taskId, "Bad proof");

      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({ status: "rejected" }),
      );
      expect(mockTaskRepo.delete).not.toHaveBeenCalled();
    });
  });
});
