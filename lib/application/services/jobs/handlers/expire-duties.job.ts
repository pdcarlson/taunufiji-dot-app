import { getContainer } from "@/lib/infrastructure/container";
import { expireOverdueDutyTask } from "@/lib/application/services/housing/overdue-duty.service";

export const expireDutiesJob = async (): Promise<{ errors: string[] }> => {
  const { taskRepository, pointsService, scheduleService } = getContainer();
  const errors: string[] = [];
  const now = new Date();

  console.log("[ExpireDutiesJob]", {
    phase: "start",
    now: now.toISOString(),
  });

  try {
    const allOpenTasks = await taskRepository.findMany({
      status: "open",
      limit: 100,
    });

    // Filter for overdue tasks
    const overdueTasks = allOpenTasks.filter((task) => {
      if (!task.due_at) return false;
      return new Date(task.due_at) <= now;
    });

    console.log("[ExpireDutiesJob]", {
      phase: "overdue_scan_complete",
      overdueCount: overdueTasks.length,
    });

    for (const task of overdueTasks) {
      try {
        const result = await expireOverdueDutyTask(task, {
          taskRepository,
          pointsService,
          scheduleService,
        });
        errors.push(...result.errors);
        if (result.expired) {
          console.log("[ExpireDutiesJob]", {
            phase: "task_expired",
            taskId: task.id,
            scheduleId: task.schedule_id ?? null,
            fined: result.fined,
            triggeredNextInstance: result.triggeredNextInstance,
            errorCount: result.errors.length,
          });
        }
      } catch (error: unknown) {
        const errMsg = `Failed to expire task ${task.id}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errMsg);
        errors.push(errMsg);
      }
    }
  } catch (error: unknown) {
    const errMsg = `Failed to query overdue tasks: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errMsg);
    errors.push(errMsg);
  }

  return { errors };
};
