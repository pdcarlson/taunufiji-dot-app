import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import type { IScheduleService } from "@/lib/domain/ports/services/schedule.service.port";
import type { TaskQueryOptions } from "@/lib/domain/ports/task.repository";
import type { HousingTask } from "@/lib/domain/types/task";
import { MockFactory } from "@/lib/test/mock-factory";

const hoisted = vi.hoisted(() => ({
  expireOverdueDutyTask: vi.fn(),
}));

vi.mock("@/lib/application/services/housing/overdue-duty.service", () => ({
  expireOverdueDutyTask: hoisted.expireOverdueDutyTask,
}));

import { expireDutiesJob } from "./expire-duties.job";

function baseTask(overrides: Partial<HousingTask> = {}): HousingTask {
  return {
    id: "task-default",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    title: "T",
    description: "",
    status: "open",
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
    notification_level: "unlocked",
    execution_limit: null,
    completed_at: null,
    ...overrides,
  };
}

describe("expireDutiesJob", () => {
  let taskRepository: ReturnType<typeof MockFactory.createTaskRepository>;
  const ledgerRepository = MockFactory.createLedgerRepository();
  const pointsService = { awardPoints: vi.fn() } as unknown as IPointsService;
  const scheduleService = {
    triggerNextInstance: vi.fn(),
  } as unknown as IScheduleService;

  beforeEach(() => {
    vi.clearAllMocks();
    taskRepository = MockFactory.createTaskRepository();
  });

  it("processes overdue open, pending, and rejected tasks through shared overdue processor", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();

    taskRepository.findMany = vi.fn().mockImplementation(
      async (opts: TaskQueryOptions) => {
        const offset = opts.offset ?? 0;
        const statuses = Array.isArray(opts.status)
          ? opts.status
          : opts.status
            ? [opts.status]
            : [];
        const isCombinedOverdueScan =
          statuses.length === 3 &&
          statuses.includes("open") &&
          statuses.includes("pending") &&
          statuses.includes("rejected");
        if (isCombinedOverdueScan) {
          if (offset > 0) return [];
          return [
            baseTask({
              id: "task-open",
              title: "Kitchen",
              status: "open",
              due_at: past,
            }),
            baseTask({
              id: "task-pending",
              title: "Hall",
              status: "pending",
              due_at: past,
            }),
            baseTask({
              id: "task-rejected",
              title: "Stairs",
              status: "rejected",
              due_at: past,
            }),
          ];
        }
        return [];
      },
    );

    hoisted.expireOverdueDutyTask.mockResolvedValue({
      expired: true,
      fined: true,
      triggeredNextInstance: true,
      errors: [],
    });

    const result = await expireDutiesJob(
      taskRepository,
      pointsService,
      scheduleService,
      ledgerRepository,
    );

    expect(result.errors).toEqual([]);
    expect(taskRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ["open", "pending", "rejected"],
      }),
    );
    expect(hoisted.expireOverdueDutyTask).toHaveBeenCalledTimes(3);
    expect(hoisted.expireOverdueDutyTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: "task-open" }),
      expect.objectContaining({
        taskRepository,
        ledgerRepository,
        pointsService,
        scheduleService,
      }),
    );
    expect(hoisted.expireOverdueDutyTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: "task-pending" }),
      expect.objectContaining({
        taskRepository,
        ledgerRepository,
        pointsService,
        scheduleService,
      }),
    );
    expect(hoisted.expireOverdueDutyTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: "task-rejected" }),
      expect.objectContaining({
        taskRepository,
        ledgerRepository,
        pointsService,
        scheduleService,
      }),
    );
  });
});
