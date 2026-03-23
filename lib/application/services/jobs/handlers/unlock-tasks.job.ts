import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { processUnlockForTask } from "@/lib/application/services/housing/task-unlock";
import {
  fetchAllTaskPages,
  HOUSING_CRON_TASK_PAGE_SIZE,
} from "../task-query-pagination";

export { processUnlockForTask } from "@/lib/application/services/housing/task-unlock";
export type { UnlockSingleTaskResult } from "@/lib/application/services/housing/task-unlock";

export const UnlockTasksJob = {
  async run(
    taskRepository: ITaskRepository,
  ): Promise<{ unlocked: number; errors: string[] }> {
    const errors: string[] = [];
    let unlocked = 0;
    const now = new Date();

    try {
      const tasksToUnlock = await fetchAllTaskPages(
        taskRepository,
        {
          status: "locked",
          unlockBefore: now,
          orderBy: "unlock_at",
          orderDirection: "asc",
        },
        HOUSING_CRON_TASK_PAGE_SIZE,
      );

      console.log("[UnlockTasksJob]", {
        phase: "unlock_scan_complete",
        toUnlock: tasksToUnlock.length,
      });

      for (const task of tasksToUnlock) {
        const result = await processUnlockForTask(taskRepository, task, now);
        errors.push(...result.errors);
        if (result.unlocked) {
          unlocked++;
        }
      }
    } catch (error: unknown) {
      const errMsg = `Failed to query locked tasks: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }

    return { unlocked, errors };
  },
};
