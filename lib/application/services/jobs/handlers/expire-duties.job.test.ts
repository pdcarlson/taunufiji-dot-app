import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import type { ScheduleService } from "@/lib/application/services/housing/schedule.service";
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

describe("expireDutiesJob", () => {
  let taskRepository: ReturnType<typeof MockFactory.createTaskRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    taskRepository = MockFactory.createTaskRepository();
  });

  it("processes overdue open and pending tasks through shared overdue processor", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();

    taskRepository.findMany = vi.fn().mockImplementation(
      async (opts: TaskQueryOptions) => {
        const offset = opts.offset ?? 0;
        if (opts.status === "open") {
          if (offset > 0) return [];
          return [
            {
              id: "task-open",
              title: "Kitchen",
              description: "",
              status: "open",
              type: "duty",
              points_value: 0,
              due_at: past,
              createdAt: "",
              updatedAt: "",
            },
          ] as HousingTask[];
        }
        if (opts.status === "pending") {
          if (offset > 0) return [];
          return [
            {
              id: "task-pending",
              title: "Hall",
              description: "",
              status: "pending",
              type: "duty",
              points_value: 0,
              due_at: past,
              createdAt: "",
              updatedAt: "",
            },
          ] as HousingTask[];
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
      {} as unknown as IPointsService,
      {} as unknown as ScheduleService,
    );

    expect(result.errors).toEqual([]);
    expect(hoisted.expireOverdueDutyTask).toHaveBeenCalledTimes(2);
    expect(hoisted.expireOverdueDutyTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: "task-open" }),
      expect.objectContaining({
        taskRepository,
      }),
    );
    expect(hoisted.expireOverdueDutyTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: "task-pending" }),
      expect.any(Object),
    );
  });
});
