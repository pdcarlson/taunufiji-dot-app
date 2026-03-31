import { AdminService } from "./admin.service";
import { MockFactory } from "@/lib/test/mock-factory";
import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import { TaskEvents } from "@/lib/domain/events";
import { ScheduleService } from "./schedule.service";
import type { HousingTask } from "@/lib/domain/types/task";

const mockTaskRepo = MockFactory.createTaskRepository();

function housingTaskFixture(overrides: Partial<HousingTask> & { id: string }): HousingTask {
  return {
    id: overrides.id,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    title: overrides.title ?? "T",
    description: overrides.description ?? "",
    status: overrides.status ?? "pending",
    type: overrides.type ?? "duty",
    points_value: overrides.points_value ?? 0,
    schedule_id: overrides.schedule_id ?? null,
    initial_image_s3_key: overrides.initial_image_s3_key ?? null,
    proof_s3_key: overrides.proof_s3_key ?? null,
    assigned_to: overrides.assigned_to ?? null,
    due_at: overrides.due_at ?? null,
    expires_at: overrides.expires_at ?? null,
    unlock_at: overrides.unlock_at ?? null,
    is_fine: overrides.is_fine ?? null,
    notification_level: overrides.notification_level,
    execution_limit: overrides.execution_limit ?? null,
    completed_at: overrides.completed_at ?? null,
  };
}

const mockScheduleService = {
  triggerNextInstance: vi.fn(),
  updateTaskThisAndFuture: vi.fn(),
  updateTaskEntireSeries: vi.fn(),
  deleteTaskThisAndFuture: vi.fn(),
  deleteTaskEntireSeries: vi.fn(),
} as unknown as ScheduleService;

vi.mock("@/lib/infrastructure/events/dispatcher", () => ({
  DomainEventBus: {
    publish: vi.fn(),
  },
}));

describe("AdminService", () => {
  let service: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DomainEventBus.publish).mockResolvedValue(undefined);
    service = new AdminService(mockTaskRepo, mockScheduleService);
  });

  describe("verifyTask", () => {
    it("should approve a pending task and set completed_at", async () => {
      const taskId = "task-123";

      vi.mocked(mockTaskRepo.findById).mockResolvedValue(
        housingTaskFixture({
          id: taskId,
          title: "Test Task",
          status: "pending",
          type: "duty",
          points_value: 10,
          assigned_to: "user-1",
          description: "desc",
        }),
      );

      await service.verifyTask(taskId, "admin-1");

      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({
          status: "approved",
          completed_at: expect.any(String),
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
      vi.mocked(mockTaskRepo.findById).mockResolvedValue(
        housingTaskFixture({
          id: "task-open",
          title: "Open",
          status: "open",
        }),
      );

      await expect(service.verifyTask("task-open", "admin-1")).rejects.toThrow(
        "Task is not pending approval.",
      );
    });

    it("should approve stale expired task when proof exists (data healing)", async () => {
      const taskId = "task-stale-expired";
      vi.mocked(mockTaskRepo.findById).mockResolvedValue(
        housingTaskFixture({
          id: taskId,
          title: "Kitchen",
          status: "expired",
          type: "duty",
          points_value: 5,
          assigned_to: "user-1",
          proof_s3_key: "proof/key",
          description: "desc",
        }),
      );

      await service.verifyTask(taskId, "admin-1");

      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({
          status: "approved",
          completed_at: expect.any(String),
        }),
      );
      expect(DomainEventBus.publish).toHaveBeenCalledWith(
        TaskEvents.TASK_APPROVED,
        expect.objectContaining({ taskId, userId: "user-1", points: 5 }),
      );
    });

    it("should rollback status and throw if EventBus fails", async () => {
      const taskId = "task-fail";
      vi.mocked(mockTaskRepo.findById).mockResolvedValue(
        housingTaskFixture({
          id: taskId,
          title: "Fail Task",
          status: "pending",
          points_value: 10,
          assigned_to: "user-1",
        }),
      );

      vi.mocked(DomainEventBus.publish).mockRejectedValue(
        new Error("Event Error"),
      );

      await expect(service.verifyTask(taskId, "admin-1")).rejects.toThrow(
        "Failed to complete approval process: Event Error",
      );

      expect(mockTaskRepo.update).toHaveBeenCalledTimes(2);
      expect(mockTaskRepo.update).toHaveBeenLastCalledWith(
        taskId,
        expect.objectContaining({
          status: "pending",
          completed_at: null,
        }),
      );
    });

    it("should rollback to expired when healing approval fails on EventBus", async () => {
      const taskId = "task-stale-rollback";
      vi.mocked(mockTaskRepo.findById).mockResolvedValue(
        housingTaskFixture({
          id: taskId,
          title: "Stairs",
          status: "expired",
          type: "duty",
          points_value: 3,
          assigned_to: "user-2",
          proof_s3_key: "proof/x",
        }),
      );
      vi.mocked(DomainEventBus.publish).mockRejectedValue(
        new Error("Event Error"),
      );

      await expect(service.verifyTask(taskId, "admin-1")).rejects.toThrow(
        "Failed to complete approval process: Event Error",
      );

      expect(mockTaskRepo.update).toHaveBeenLastCalledWith(
        taskId,
        expect.objectContaining({
          status: "expired",
          completed_at: null,
        }),
      );
    });

    it("should use overridePoints if provided", async () => {
      const taskId = "task-override";
      vi.mocked(mockTaskRepo.findById).mockResolvedValue(
        housingTaskFixture({
          id: taskId,
          title: "Override Task",
          status: "pending",
          points_value: 10,
          assigned_to: "user-1",
        }),
      );

      await service.verifyTask(taskId, "admin-1", 20);

      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({
          status: "approved",
          points_value: 20,
        }),
      );

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
      vi.mocked(mockTaskRepo.findById).mockResolvedValue(
        housingTaskFixture({
          id: taskId,
          type: "ad_hoc",
          assigned_to: "user-1",
          title: "Extra Work",
        }),
      );

      await service.rejectTask(taskId, "Not needed");

      expect(mockTaskRepo.delete).toHaveBeenCalledWith(taskId);
      expect(mockTaskRepo.update).not.toHaveBeenCalled();
      expect(DomainEventBus.publish).toHaveBeenCalledWith(
        TaskEvents.TASK_REJECTED,
        expect.objectContaining({ taskId }),
      );
    });

    it("should update status for normal tasks upon rejection", async () => {
      const taskId = "duty-1";
      vi.mocked(mockTaskRepo.findById).mockResolvedValue(
        housingTaskFixture({
          id: taskId,
          type: "duty",
          assigned_to: "user-1",
          title: "Clean",
        }),
      );

      await service.rejectTask(taskId, "Bad proof");

      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({ status: "rejected" }),
      );
      expect(mockTaskRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("recurring scope mutations", () => {
    it("updates only one task when scope is this_instance", async () => {
      vi.mocked(mockTaskRepo.findById).mockResolvedValue(
        housingTaskFixture({
          id: "task-1",
          schedule_id: "schedule-1",
          title: "S",
        }),
      );
      vi.mocked(mockTaskRepo.update).mockResolvedValue(
        housingTaskFixture({ id: "task-1", title: "S" }),
      );

      await service.updateTask(
        "task-1",
        { title: "Updated title" },
        { scope: "this_instance" },
      );

      expect(mockTaskRepo.update).toHaveBeenCalledWith("task-1", {
        title: "Updated title",
      });
      expect(
        mockScheduleService.updateTaskThisAndFuture,
      ).not.toHaveBeenCalled();
    });

    it("routes update to schedule service for this_and_future scope", async () => {
      const task = housingTaskFixture({
        id: "task-2",
        schedule_id: "schedule-2",
        due_at: "2026-03-10T03:59:00.000Z",
        title: "S",
      });
      vi.mocked(mockTaskRepo.findById).mockResolvedValue(task);
      vi.mocked(mockScheduleService.updateTaskThisAndFuture).mockResolvedValue(
        task,
      );

      await service.updateTask(
        "task-2",
        { description: "next" },
        {
          scope: "this_and_future",
        },
      );

      expect(mockScheduleService.updateTaskThisAndFuture).toHaveBeenCalledWith(
        task,
        { description: "next" },
        "2026-03-10T03:59:00.000Z",
        { scope: "this_and_future" },
      );
    });

    it("routes update to entire_series without requiring due_at", async () => {
      const task = housingTaskFixture({
        id: "task-X",
        schedule_id: "schedule-X",
        title: "S",
      });
      const payload = { title: "Series title" };
      vi.mocked(mockTaskRepo.findById).mockResolvedValue(task);
      vi.mocked(mockScheduleService.updateTaskEntireSeries).mockResolvedValue(
        task,
      );

      await service.updateTask("task-X", payload, { scope: "entire_series" });

      expect(mockScheduleService.updateTaskEntireSeries).toHaveBeenCalledWith(
        task,
        payload,
        undefined,
        { scope: "entire_series" },
      );
    });

    it("routes delete to schedule service for entire_series scope", async () => {
      const task = housingTaskFixture({
        id: "task-Y",
        schedule_id: "schedule-Y",
        title: "S",
      });
      vi.mocked(mockTaskRepo.findById).mockResolvedValue(task);

      await service.deleteTask("task-Y", { scope: "entire_series" });

      expect(mockScheduleService.deleteTaskEntireSeries).toHaveBeenCalledWith(
        task,
        undefined,
      );
      expect(mockTaskRepo.delete).not.toHaveBeenCalled();
    });

    it("routes delete to schedule service for this_and_future scope", async () => {
      const task = housingTaskFixture({
        id: "task-Z",
        schedule_id: "schedule-Z",
        due_at: "2026-03-10T03:59:00.000Z",
        title: "S",
      });
      vi.mocked(mockTaskRepo.findById).mockResolvedValue(task);

      await service.deleteTask("task-Z", { scope: "this_and_future" });

      expect(mockScheduleService.deleteTaskThisAndFuture).toHaveBeenCalledWith(
        task,
        "2026-03-10T03:59:00.000Z",
      );
      expect(mockTaskRepo.delete).not.toHaveBeenCalled();
    });
  });
});
