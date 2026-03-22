import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  return {
    taskRepository: {
      findMany: vi.fn(),
    },
    pointsService: {},
    scheduleService: {},
    expireOverdueDutyTask: vi.fn(),
  };
});

vi.mock("@/lib/infrastructure/container", () => ({
  getContainer: () => ({
    taskRepository: hoisted.taskRepository,
    pointsService: hoisted.pointsService,
    scheduleService: hoisted.scheduleService,
  }),
}));

vi.mock("@/lib/application/services/housing/overdue-duty.service", () => ({
  expireOverdueDutyTask: hoisted.expireOverdueDutyTask,
}));

import { expireDutiesJob } from "./expire-duties.job";

describe("expireDutiesJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes overdue open tasks through shared overdue processor", async () => {
    hoisted.taskRepository.findMany.mockResolvedValue([
      {
        id: "task-1",
        title: "Kitchen",
        status: "open",
        due_at: new Date(Date.now() - 60_000).toISOString(),
      },
      {
        id: "task-2",
        title: "Future",
        status: "open",
        due_at: new Date(Date.now() + 60_000).toISOString(),
      },
    ]);
    hoisted.expireOverdueDutyTask.mockResolvedValue({
      expired: true,
      fined: true,
      triggeredNextInstance: true,
      errors: [],
    });

    const result = await expireDutiesJob();

    expect(result.errors).toEqual([]);
    expect(hoisted.expireOverdueDutyTask).toHaveBeenCalledTimes(1);
    expect(hoisted.expireOverdueDutyTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: "task-1" }),
      expect.objectContaining({
        taskRepository: hoisted.taskRepository,
      }),
    );
  });
});
