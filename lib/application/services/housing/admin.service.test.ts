import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminService } from "./admin.service";
import { MockFactory } from "@/lib/test/mock-factory";
import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";

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
  TaskEvents: {
    // Must mock TaskEvents if used in publish mock matching
    TASK_APPROVED: "TASK_APPROVED",
  },
}));

describe("AdminService", () => {
  let service: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminService(mockTaskRepo, mockScheduleService);
  });

  describe("verifyTask", () => {
    it("should approve a pending task and set completed_at", async () => {
      const taskId = "task-123";

      // Mock findById to return a pending task
      mockTaskRepo.findById.mockResolvedValue({
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
        "TASK_APPROVED",
        expect.objectContaining({
          taskId: taskId,
          title: "Test Task",
          userId: "user-1",
          points: 10,
        }),
      );
    });

    it("should throw error if task is not pending", async () => {
      mockTaskRepo.findById.mockResolvedValue({
        id: "task-open",
        status: "open",
      } as any);

      await expect(service.verifyTask("task-open", "admin-1")).rejects.toThrow(
        "Task is not pending approval.",
      );
    });

    it("should rollback status and throw if EventBus fails", async () => {
      const taskId = "task-fail";
      mockTaskRepo.findById.mockResolvedValue({
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
  });
});
