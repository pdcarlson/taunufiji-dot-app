import { describe, expect, it, vi } from "vitest";
import { expireOverdueDutyTask } from "./overdue-duty.service";
import type { HousingTask } from "@/lib/domain/types/task";
import type { ITaskRepository } from "@/lib/domain/ports/task.repository";
import type { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import type { IScheduleService } from "@/lib/domain/ports/services/schedule.service.port";
import type { ILedgerRepository } from "@/lib/domain/ports/ledger.repository";

function dutyTask(overrides: Partial<HousingTask> = {}): HousingTask {
  return {
    id: "t1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    title: "Kitchen",
    description: "",
    status: "open",
    type: "duty",
    points_value: 10,
    schedule_id: null,
    initial_image_s3_key: null,
    proof_s3_key: null,
    assigned_to: "user-1",
    due_at: "2020-01-01T00:00:00.000Z",
    expires_at: null,
    unlock_at: null,
    is_fine: null,
    notification_level: "unlocked",
    execution_limit: null,
    completed_at: null,
    ...overrides,
  };
}

describe("expireOverdueDutyTask", () => {
  it("does not expire approved tasks even when scan data is stale", async () => {
    const taskRepository = {
      update: vi.fn(),
    } as unknown as ITaskRepository;
    const result = await expireOverdueDutyTask(
      dutyTask({ status: "approved", proof_s3_key: "k" }),
      {
        taskRepository,
        pointsService: { awardPoints: vi.fn() } as unknown as IPointsService,
        scheduleService: {
          triggerNextInstance: vi.fn(),
        } as unknown as IScheduleService,
        ledgerRepository: {} as ILedgerRepository,
      },
    );
    expect(result.expired).toBe(false);
    expect(taskRepository.update).not.toHaveBeenCalled();
  });

  it("does not expire pending tasks that already have proof", async () => {
    const taskRepository = {
      update: vi.fn(),
    } as unknown as ITaskRepository;
    const result = await expireOverdueDutyTask(
      dutyTask({ status: "pending", proof_s3_key: "proof/key" }),
      {
        taskRepository,
        pointsService: { awardPoints: vi.fn() } as unknown as IPointsService,
        scheduleService: {
          triggerNextInstance: vi.fn(),
        } as unknown as IScheduleService,
        ledgerRepository: {} as ILedgerRepository,
      },
    );
    expect(result.expired).toBe(false);
    expect(taskRepository.update).not.toHaveBeenCalled();
  });
});
