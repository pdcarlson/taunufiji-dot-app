import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import type { TaskQueryOptions } from "@/lib/domain/ports/task.repository";
import type { HousingTask } from "@/lib/domain/types/task";
import { MockFactory } from "@/lib/test/mock-factory";
import { pendingFinesJob } from "./pending-fines.job";
import { HOUSING_CONSTANTS } from "@/lib/constants";

describe("pendingFinesJob", () => {
  let taskRepository: ReturnType<typeof MockFactory.createTaskRepository>;
  const pointsService = { awardPoints: vi.fn() } as unknown as IPointsService;

  beforeEach(() => {
    vi.clearAllMocks();
    taskRepository = MockFactory.createTaskRepository();
  });

  it("retries awardPoints for expired assigned tasks with fine not applied", async () => {
    taskRepository.findMany = vi.fn().mockImplementation(
      async (opts: TaskQueryOptions) => {
        const offset = opts.offset ?? 0;
        if (offset > 0) return [];
        return [
          {
            id: "task-1",
            title: "Kitchen",
            description: "",
            status: "expired",
            type: "duty",
            points_value: 0,
            assigned_to: "user-1",
            is_fine: false,
            due_at: new Date().toISOString(),
            createdAt: "",
            updatedAt: "",
          },
        ] as HousingTask[];
      },
    );
    taskRepository.update = vi.fn().mockResolvedValue({} as HousingTask);
    (pointsService.awardPoints as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );

    const result = await pendingFinesJob(taskRepository, pointsService);

    expect(result.errors).toEqual([]);
    expect(pointsService.awardPoints).toHaveBeenCalledWith("user-1", {
      amount: -Math.abs(HOUSING_CONSTANTS.FINE_MISSING_DUTY),
      reason: "Missed Duty: Kitchen",
      category: "fine",
    });
    expect(taskRepository.update).toHaveBeenCalledWith("task-1", {
      is_fine: true,
    });
  });
});
