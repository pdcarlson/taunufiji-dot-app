import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import { HOUSING_CONSTANTS } from "@/lib/constants";
import {
  fetchAllTaskPages,
  HOUSING_CRON_TASK_PAGE_SIZE,
} from "../task-query-pagination";

/**
 * Retries ledger fines for expired duties where `awardPoints` failed after status was persisted.
 */
export const pendingFinesJob = async (
  taskRepository: ITaskRepository,
  pointsService: IPointsService,
): Promise<{ errors: string[] }> => {
  const errors: string[] = [];

  try {
    const tasks = await fetchAllTaskPages(
      taskRepository,
      {
        status: "expired",
        assignedToPresent: true,
        fineNotApplied: true,
        orderBy: "due_at",
        orderDirection: "asc",
      },
      HOUSING_CRON_TASK_PAGE_SIZE,
    );

    for (const task of tasks) {
      if (
        task.type === "bounty" ||
        task.type === "project" ||
        task.type === "ad_hoc"
      ) {
        continue;
      }
      if (!task.assigned_to) {
        continue;
      }

      try {
        await pointsService.awardPoints(task.assigned_to, {
          amount: -Math.abs(HOUSING_CONSTANTS.FINE_MISSING_DUTY),
          reason: `Missed Duty: ${task.title}`,
          category: "fine",
        });
        await taskRepository.update(task.id, { is_fine: true });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const errMsg = `Pending fine retry failed for ${task.id}: ${message}`;
        console.error(errMsg);
        errors.push(errMsg);
      }
    }
  } catch (error: unknown) {
    const errMsg = `Failed to query pending fines: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errMsg);
    errors.push(errMsg);
  }

  return { errors };
};
