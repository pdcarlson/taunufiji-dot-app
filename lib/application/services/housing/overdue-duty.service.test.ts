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

const depsBase = {
  pointsService: { awardPoints: vi.fn() } as unknown as IPointsService,
  scheduleService: {
    triggerNextInstance: vi.fn(),
  } as unknown as IScheduleService,
  ledgerRepository: {} as ILedgerRepository,
};

describe("expireOverdueDutyTask", () => {
  it("does not expire when live row is approved", async () => {
    const live = dutyTask({ status: "approved", proof_s3_key: "k" });
    const taskRepository = {
      findById: vi.fn().mockResolvedValue(live),
      update: vi.fn(),
    } as unknown as ITaskRepository;
    const result = await expireOverdueDutyTask(dutyTask({ status: "open" }), {
      taskRepository,
      ...depsBase,
    });
    expect(result.expired).toBe(false);
    expect(taskRepository.update).not.toHaveBeenCalled();
  });

  it("does not expire when live row is pending with proof", async () => {
    const live = dutyTask({ status: "pending", proof_s3_key: "proof/key" });
    const taskRepository = {
      findById: vi.fn().mockResolvedValue(live),
      update: vi.fn(),
    } as unknown as ITaskRepository;
    const result = await expireOverdueDutyTask(
      dutyTask({ status: "open", proof_s3_key: null }),
      {
        taskRepository,
        ...depsBase,
      },
    );
    expect(result.expired).toBe(false);
    expect(taskRepository.update).not.toHaveBeenCalled();
  });

  it("uses live row for expiry even when snapshot was stale open without proof", async () => {
    const live = dutyTask({
      id: "t-live",
      status: "open",
      proof_s3_key: null,
      due_at: "2020-01-01T00:00:00.000Z",
    });
    const taskRepository = {
      findById: vi.fn().mockResolvedValue(live),
      update: vi.fn().mockImplementation(async (_id, patch) => ({
        ...live,
        ...patch,
      })),
    } as unknown as ITaskRepository;
    const ledgerRepository = {
      findMany: vi.fn().mockResolvedValue([]),
    } as unknown as ILedgerRepository;
    const pointsService = {
      awardPoints: vi.fn().mockResolvedValue(undefined),
    } as unknown as IPointsService;

    const result = await expireOverdueDutyTask(
      dutyTask({
        id: "t-live",
        status: "open",
        proof_s3_key: null,
        due_at: "2020-01-01T00:00:00.000Z",
      }),
      {
        taskRepository,
        pointsService,
        scheduleService: depsBase.scheduleService,
        ledgerRepository,
      },
    );

    expect(result.expired).toBe(true);
    expect(taskRepository.findById).toHaveBeenCalledWith("t-live");
    expect(taskRepository.update).toHaveBeenCalledWith(
      "t-live",
      expect.objectContaining({ status: "expired" }),
    );
  });
});
