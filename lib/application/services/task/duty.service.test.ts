import { describe, it, expect, vi, beforeEach } from "vitest";
import { DutyService } from "./duty.service";
import { MockFactory } from "@/lib/test/mock-factory";
import { setContainer, resetContainer } from "@/lib/infrastructure/container";
import { HousingTask } from "@/lib/domain/entities";

describe("DutyService", () => {
  const mockTaskRepo = MockFactory.createTaskRepository();

  beforeEach(() => {
    vi.clearAllMocks();
    resetContainer();
    setContainer({
      taskRepository: mockTaskRepo,
    });
  });

  describe("claimTask", () => {
    it("should allow claiming an Open task", async () => {
      mockTaskRepo.findById = vi.fn().mockResolvedValue({
        $id: "task_1",
        status: "open",
        title: "Clean Kitchen",
      } as HousingTask);

      mockTaskRepo.update = vi.fn().mockResolvedValue({
        $id: "task_1",
        status: "pending",
        assigned_to: "user_1",
      });

      await DutyService.claimTask("task_1", "user_1");

      expect(mockTaskRepo.update).toHaveBeenCalledWith("task_1", {
        status: "pending",
        assigned_to: "user_1",
      });
    });

    it("should reject claiming a task that is not Open", async () => {
      mockTaskRepo.findById = vi.fn().mockResolvedValue({
        $id: "task_1",
        status: "pending", // Already claimed
      } as HousingTask);

      await expect(DutyService.claimTask("task_1", "user_1")).rejects.toThrow(
        "available",
      );
    });
  });

  describe("submitProof", () => {
    it("should allow assignee to submit proof", async () => {
      mockTaskRepo.findById = vi.fn().mockResolvedValue({
        $id: "task_1",
        assigned_to: "user_1",
        status: "pending",
      } as HousingTask);

      await DutyService.submitProof("task_1", "user_1", "s3_key_123");

      expect(mockTaskRepo.update).toHaveBeenCalledWith("task_1", {
        status: "pending",
        proof_s3_key: "s3_key_123",
      });
    });

    it("should reject submission from non-assignee", async () => {
      mockTaskRepo.findById = vi.fn().mockResolvedValue({
        $id: "task_1",
        assigned_to: "user_OTHER",
      } as HousingTask);

      await expect(
        DutyService.submitProof("task_1", "user_1", "key"),
      ).rejects.toThrow("assigned");
    });
  });

  describe("getMyTasks", () => {
    // This tests the PURITY of getMyTasks (no side effects)
    it("should return filtered tasks without modifications", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 100000);

      const tasks = [
        { $id: "t1", status: "open" },
        { $id: "t2", status: "approved" }, // Should be hidden
        { $id: "t3", status: "expired" }, // Should be hidden
        { $id: "t4", status: "locked", unlock_at: past.toISOString() }, // Should be hidden (until Maintenance runs)
      ] as HousingTask[];

      mockTaskRepo.findByAssignee = vi.fn().mockResolvedValue(tasks);

      const result = await DutyService.getMyTasks("user_1");

      // t1 is open -> include
      // t2 is approved -> exclude
      // t3 is expired -> exclude
      // t4 is locked -> include (as is, because Maintenance handles updates now)

      expect(result.documents).toHaveLength(2);
      expect(result.documents.map((d) => d.$id)).toContain("t1");
      expect(result.documents.map((d) => d.$id)).toContain("t4");

      // CRITICAL: Ensure NO updates were called
      expect(mockTaskRepo.update).not.toHaveBeenCalled();
    });
  });
});
