import { describe, expect, it, vi } from "vitest";
import { expireOverdueDutyTask } from "./overdue-duty.service";
import { missedDutyFineReason } from "./missed-duty-fine";
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

const ledgerRepositoryEmpty = {
  findMany: vi.fn().mockResolvedValue([]),
} as unknown as ILedgerRepository;

const depsBase = {
  pointsService: { awardPoints: vi.fn() } as unknown as IPointsService,
  scheduleService: {
    triggerNextInstance: vi.fn().mockResolvedValue(undefined),
  } as unknown as IScheduleService,
  ledgerRepository: ledgerRepositoryEmpty,
};

describe("expireOverdueDutyTask", () => {
  it("does not expire when live row is approved", async () => {
    const live = dutyTask({ status: "approved", proof_s3_key: null });
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

  it("does not expire rejected duty when live row has proof (same as pending)", async () => {
    const live = dutyTask({
      status: "rejected",
      proof_s3_key: "resubmit/key",
    });
    const taskRepository = {
      findById: vi.fn().mockResolvedValue(live),
      update: vi.fn(),
    } as unknown as ITaskRepository;
    const result = await expireOverdueDutyTask(
      dutyTask({ status: "rejected", proof_s3_key: null }),
      {
        taskRepository,
        ...depsBase,
      },
    );
    expect(result.expired).toBe(false);
    expect(taskRepository.update).not.toHaveBeenCalled();
  });

  it("expires rejected duty when live row has no proof and is past due", async () => {
    const live = dutyTask({
      id: "t-rej",
      status: "rejected",
      proof_s3_key: null,
      due_at: "2020-01-01T00:00:00.000Z",
      assigned_to: "u1",
    });
    const taskRepository = {
      findById: vi.fn().mockResolvedValue(live),
      update: vi.fn().mockImplementation(async (_id, patch) => ({
        ...live,
        ...patch,
      })),
    } as unknown as ITaskRepository;
    const pointsService = {
      awardPoints: vi.fn().mockResolvedValue(undefined),
    } as unknown as IPointsService;

    const result = await expireOverdueDutyTask(dutyTask({ id: "t-rej" }), {
      taskRepository,
      pointsService,
      scheduleService: depsBase.scheduleService,
      ledgerRepository: depsBase.ledgerRepository,
    });

    expect(result.expired).toBe(true);
    expect(taskRepository.update).toHaveBeenCalledWith(
      "t-rej",
      expect.objectContaining({ status: "expired" }),
    );
  });

  it.each([["bounty"], ["project"], ["ad_hoc"]] as const)(
    "does not expire when live row type is %s",
    async (nonExpirableType) => {
      const live = dutyTask({
        type: nonExpirableType,
        status: "open",
        proof_s3_key: null,
        due_at: "2020-01-01T00:00:00.000Z",
      });
      const taskRepository = {
        findById: vi.fn().mockResolvedValue(live),
        update: vi.fn(),
      } as unknown as ITaskRepository;
      const result = await expireOverdueDutyTask(dutyTask({ type: "duty" }), {
        taskRepository,
        ...depsBase,
      });
      expect(result.expired).toBe(false);
      expect(taskRepository.update).not.toHaveBeenCalled();
    },
  );

  it("calls scheduleService.triggerNextInstance when live row has schedule_id", async () => {
    const scheduleId = "sched-99";
    const live = dutyTask({
      id: "t-sched",
      schedule_id: scheduleId,
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
    const pointsService = {
      awardPoints: vi.fn().mockResolvedValue(undefined),
    } as unknown as IPointsService;
    const triggerNextInstance = vi.fn().mockResolvedValue(undefined);
    const scheduleService = {
      triggerNextInstance,
    } as unknown as IScheduleService;

    const result = await expireOverdueDutyTask(dutyTask({ id: "t-sched" }), {
      taskRepository,
      pointsService,
      scheduleService,
      ledgerRepository: depsBase.ledgerRepository,
    });

    expect(result.expired).toBe(true);
    expect(result.triggeredNextInstance).toBe(true);
    expect(triggerNextInstance).toHaveBeenCalledWith(
      scheduleId,
      expect.objectContaining({ id: "t-sched", status: "expired" }),
    );
  });

  it("when ledger already has missed-duty marker, sets is_fine without awardPoints", async () => {
    const taskId = "t-dup-fine";
    const userId = "user-dup";
    const live = dutyTask({
      id: taskId,
      assigned_to: userId,
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
      findMany: vi.fn().mockResolvedValue([
        {
          reason: missedDutyFineReason("Kitchen", taskId),
          category: "fine",
        },
      ]),
    } as unknown as ILedgerRepository;
    const pointsService = {
      awardPoints: vi.fn(),
    } as unknown as IPointsService;

    const result = await expireOverdueDutyTask(dutyTask({ id: taskId }), {
      taskRepository,
      pointsService,
      scheduleService: depsBase.scheduleService,
      ledgerRepository,
    });

    expect(result.expired).toBe(true);
    expect(result.fined).toBe(true);
    expect(pointsService.awardPoints).not.toHaveBeenCalled();
    expect(taskRepository.update).toHaveBeenCalledWith(taskId, {
      is_fine: true,
    });
  });

  it("records Fine failed when ledgerRepository.findMany throws", async () => {
    const live = dutyTask({
      id: "t-ledger-err",
      assigned_to: "u-ledger",
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
      findMany: vi.fn().mockRejectedValue(new Error("ledger down")),
    } as unknown as ILedgerRepository;

    const result = await expireOverdueDutyTask(dutyTask({ id: "t-ledger-err" }), {
      taskRepository,
      pointsService: depsBase.pointsService,
      scheduleService: depsBase.scheduleService,
      ledgerRepository,
    });

    expect(result.expired).toBe(true);
    expect(result.fined).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Fine failed for t-ledger-err: ledger down/),
      ]),
    );
  });

  it("records Fine failed when pointsService.awardPoints throws", async () => {
    const live = dutyTask({
      id: "t-points-err",
      assigned_to: "u-points",
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
    const pointsService = {
      awardPoints: vi.fn().mockRejectedValue(new Error("points down")),
    } as unknown as IPointsService;

    const result = await expireOverdueDutyTask(dutyTask({ id: "t-points-err" }), {
      taskRepository,
      pointsService,
      scheduleService: depsBase.scheduleService,
      ledgerRepository: depsBase.ledgerRepository,
    });

    expect(result.expired).toBe(true);
    expect(result.fined).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Fine failed for t-points-err: points down/),
      ]),
    );
  });

  it("records Scheduler failed when triggerNextInstance throws", async () => {
    const live = dutyTask({
      id: "t-sched-fail",
      schedule_id: "sched-x",
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
    const pointsService = {
      awardPoints: vi.fn().mockResolvedValue(undefined),
    } as unknown as IPointsService;
    const scheduleService = {
      triggerNextInstance: vi
        .fn()
        .mockRejectedValue(new Error("scheduler boom")),
    } as unknown as IScheduleService;

    const result = await expireOverdueDutyTask(dutyTask({ id: "t-sched-fail" }), {
      taskRepository,
      pointsService,
      scheduleService,
      ledgerRepository: depsBase.ledgerRepository,
    });

    expect(result.expired).toBe(true);
    expect(result.triggeredNextInstance).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /Scheduler failed for t-sched-fail: scheduler boom/,
        ),
      ]),
    );
  });

  it("uses live row for expiry even when snapshot was stale open without proof", async () => {
    const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
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
    const pointsService = {
      awardPoints: vi.fn().mockResolvedValue(undefined),
    } as unknown as IPointsService;

    const result = await expireOverdueDutyTask(
      dutyTask({
        id: "t-live",
        status: "open",
        proof_s3_key: null,
        due_at: futureDue,
      }),
      {
        taskRepository,
        pointsService,
        scheduleService: depsBase.scheduleService,
        ledgerRepository: depsBase.ledgerRepository,
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
