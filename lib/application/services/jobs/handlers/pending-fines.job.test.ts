import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import type { TaskQueryOptions } from "@/lib/domain/ports/task.repository";
import type { HousingTask } from "@/lib/domain/types/task";
import { MockFactory } from "@/lib/test/mock-factory";
import { pendingFinesJob } from "./pending-fines.job";
import { HOUSING_CONSTANTS } from "@/lib/constants";
import { missedDutyFineReason } from "@/lib/application/services/housing/missed-duty-fine";

function baseTask(overrides: Partial<HousingTask> = {}): HousingTask {
  return {
    id: "task-default",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    title: "Kitchen",
    description: "",
    status: "expired",
    type: "duty",
    points_value: 0,
    schedule_id: null,
    initial_image_s3_key: null,
    proof_s3_key: null,
    assigned_to: "user-1",
    due_at: new Date().toISOString(),
    expires_at: null,
    unlock_at: null,
    is_fine: false,
    notification_level: "unlocked",
    execution_limit: null,
    completed_at: null,
    ...overrides,
  };
}

describe("pendingFinesJob", () => {
  let taskRepository: ReturnType<typeof MockFactory.createTaskRepository>;
  let ledgerRepository: ReturnType<typeof MockFactory.createLedgerRepository>;
  const pointsService = { awardPoints: vi.fn() } as unknown as IPointsService;

  beforeEach(() => {
    vi.clearAllMocks();
    taskRepository = MockFactory.createTaskRepository();
    ledgerRepository = MockFactory.createLedgerRepository();
  });

  it("retries awardPoints for expired assigned tasks with fine not applied", async () => {
    taskRepository.findMany = vi.fn().mockImplementation(
      async (opts: TaskQueryOptions) => {
        const offset = opts.offset ?? 0;
        if (offset > 0) return [];
        return [baseTask({ id: "task-1", title: "Kitchen" })];
      },
    );
    taskRepository.update = vi.fn().mockResolvedValue(baseTask());
    ledgerRepository.findMany = vi.fn().mockResolvedValue([]);
    (pointsService.awardPoints as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );

    const result = await pendingFinesJob(
      taskRepository,
      pointsService,
      ledgerRepository,
    );

    expect(result.errors).toEqual([]);
    expect(pointsService.awardPoints).toHaveBeenCalledWith("user-1", {
      amount: -Math.abs(HOUSING_CONSTANTS.FINE_MISSING_DUTY),
      reason: missedDutyFineReason("Kitchen", "task-1"),
      category: "fine",
    });
    expect(taskRepository.update).toHaveBeenCalledWith("task-1", {
      is_fine: true,
    });
  });

  it("skips awardPoints when ledger already has fine for task id in reason", async () => {
    taskRepository.findMany = vi.fn().mockImplementation(
      async (opts: TaskQueryOptions) => {
        const offset = opts.offset ?? 0;
        if (offset > 0) return [];
        return [baseTask({ id: "task-dup", title: "Stairs" })];
      },
    );
    taskRepository.update = vi.fn().mockResolvedValue(baseTask());
    ledgerRepository.findMany = vi.fn().mockResolvedValue([
      {
        id: "led-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        amount: 1,
        reason: missedDutyFineReason("Stairs", "task-dup"),
        category: "fine",
        timestamp: new Date().toISOString(),
        user_id: "user-1",
        is_debit: true,
      },
    ]);

    const result = await pendingFinesJob(
      taskRepository,
      pointsService,
      ledgerRepository,
    );

    expect(result.errors).toEqual([]);
    expect(pointsService.awardPoints).not.toHaveBeenCalled();
    expect(taskRepository.update).toHaveBeenCalledWith("task-dup", {
      is_fine: true,
    });
  });
});
