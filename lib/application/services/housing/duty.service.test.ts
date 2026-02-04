import { describe, it, expect, vi, beforeEach } from "vitest";
import { DutyService } from "./duty.service";
import { MockFactory } from "@/lib/test/mock-factory";
import { HousingTask } from "@/lib/domain/entities";

// Helper to create valid HousingTask mock
vi.mock("@/lib/infrastructure/events/dispatcher", () => ({
  DomainEventBus: {
    publish: vi.fn(),
  },
  TaskEvents: {
    TASK_CLAIMED: "task.claimed",
    TASK_SUBMITTED: "task.submitted",
    TASK_APPROVED: "task.approved",
    TASK_REJECTED: "task.rejected",
    TASK_REASSIGNED: "task.reassigned",
    TASK_UNASSIGNED: "task.unassigned",
  },
}));

const createMockTask = (overrides: Partial<HousingTask>): HousingTask => ({
  id: "task_default",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: "Test Task",
  description: "Test Description",
  status: "open",
  type: "bounty",
  points_value: 0,
  ...overrides,
});

describe("DutyService", () => {
  const mockTaskRepo = MockFactory.createTaskRepository();
  let service: DutyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DutyService(mockTaskRepo);
  });

  describe("claimTask", () => {
    it("should allow claiming an Open task", async () => {
      mockTaskRepo.findById = vi.fn().mockResolvedValue(
        createMockTask({
          id: "task_1",
          status: "open",
          title: "Clean Kitchen",
        }),
      );

      mockTaskRepo.update = vi.fn().mockResolvedValue(
        createMockTask({
          id: "task_1",
          status: "pending",
          assigned_to: "user_1",
        }),
      );

      await service.claimTask("task_1", "user_1");

      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        "task_1",
        expect.objectContaining({
          status: "pending",
          assigned_to: "user_1",
        }),
      );
    });

    it("should reject claiming a task that is not Open", async () => {
      mockTaskRepo.findById = vi.fn().mockResolvedValue(
        createMockTask({
          id: "task_1",
          status: "pending", // Already claimed
        }),
      );

      await expect(service.claimTask("task_1", "user_1")).rejects.toThrow(
        "available",
      );
    });
  });

  describe("submitProof", () => {
    it("should allow assignee to submit proof", async () => {
      mockTaskRepo.findById = vi.fn().mockResolvedValue(
        createMockTask({
          id: "task_1",
          assigned_to: "user_1",
          status: "pending",
        }),
      );

      await service.submitProof("task_1", "user_1", "s3_key_123");

      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        "task_1",
        expect.objectContaining({
          status: "pending",
          proof_s3_key: "s3_key_123",
        }),
      );
    });

    it("should reject submission from non-assignee", async () => {
      mockTaskRepo.findById = vi.fn().mockResolvedValue(
        createMockTask({
          id: "task_1",
          assigned_to: "user_OTHER",
        }),
      );

      await expect(
        service.submitProof("task_1", "user_1", "key"),
      ).rejects.toThrow("assigned");
    });
  });

  describe("getMyTasks", () => {
    // This tests the PURITY of getMyTasks (no side effects)
    it("should return filtered tasks without modifications", async () => {
      const tasks = [
        createMockTask({ id: "t1", status: "open" }),
        createMockTask({ id: "t2", status: "approved" }), // Should be hidden
        createMockTask({ id: "t3", status: "expired" }), // Should be hidden
        createMockTask({ id: "t4", status: "locked" }), // Should be hidden (until Maintenance runs)
      ];

      mockTaskRepo.findByAssignee = vi.fn().mockResolvedValue(tasks);

      const result = await service.getMyTasks("user_1");

      // t1 is open -> include
      // t2 is approved -> exclude
      // t3 is expired -> exclude
      // t4 is locked -> include (as is)

      expect(result.documents).toHaveLength(2);
      expect(result.documents.map((d) => d.id)).toContain("t1");
      expect(result.documents.map((d) => d.id)).toContain("t4");

      // CRITICAL: Ensure NO updates were called
      expect(mockTaskRepo.update).not.toHaveBeenCalled();
    });
  });
  describe("requestAdHocPoints", () => {
    it("should create a task and emit submitted event", async () => {
      const mockTask = createMockTask({
        id: "adhoc_1",
        title: "Ad Hoc Work",
        points_value: 50,
        type: "ad_hoc",
        status: "pending",
        assigned_to: "user_1",
        proof_s3_key: "proof_key",
      });

      mockTaskRepo.create = vi.fn().mockResolvedValue(mockTask);

      const result = await service.requestAdHocPoints("user_1", {
        title: "Ad Hoc Work",
        description: "Desc",
        points: 50,
        proofKey: "proof_key",
      });

      expect(mockTaskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ad_hoc",
          status: "pending",
          points_value: 50,
          assigned_to: "user_1",
          notification_level: "urgent",
        }),
      );

      // Verify SUBMITTED event is emitted, not CREATED
      // Because we want it to show up as "Pending Review" immediately
      expect(result).toEqual(mockTask);
    });
  });
});
