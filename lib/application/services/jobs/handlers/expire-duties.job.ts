import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { ILedgerRepository } from "@/lib/domain/ports/ledger.repository";
import { expireOverdueDutyTask } from "@/lib/application/services/housing/overdue-duty.service";
import { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import { IScheduleService } from "@/lib/domain/ports/services/schedule.service.port";
import {
  fetchAllTaskPages,
  HOUSING_CRON_TASK_PAGE_SIZE,
} from "../task-query-pagination";

export const expireDutiesJob = async (
  taskRepository: ITaskRepository,
  pointsService: IPointsService,
  scheduleService: IScheduleService,
  ledgerRepository: ILedgerRepository,
): Promise<{ errors: string[] }> => {
  const errors: string[] = [];
  const now = new Date();

  console.log("[ExpireDutiesJob]", {
    phase: "start",
    now: now.toISOString(),
  });

  try {
    const openOverdue = await fetchAllTaskPages(
      taskRepository,
      {
        status: "open",
        dueBefore: now,
        proofS3KeyAbsent: true,
        orderBy: "due_at",
        orderDirection: "asc",
      },
      HOUSING_CRON_TASK_PAGE_SIZE,
    );

    const pendingOverdue = await fetchAllTaskPages(
      taskRepository,
      {
        status: "pending",
        dueBefore: now,
        proofS3KeyAbsent: true,
        orderBy: "due_at",
        orderDirection: "asc",
      },
      HOUSING_CRON_TASK_PAGE_SIZE,
    );

    const rejectedOverdue = await fetchAllTaskPages(
      taskRepository,
      {
        status: "rejected",
        dueBefore: now,
        proofS3KeyAbsent: true,
        orderBy: "due_at",
        orderDirection: "asc",
      },
      HOUSING_CRON_TASK_PAGE_SIZE,
    );

    // Pending overwrites open; rejected overwrites both for the same id (resubmit flow).
    const byId = new Map<string, (typeof openOverdue)[0]>();
    for (const task of openOverdue) {
      byId.set(task.id, task);
    }
    for (const task of pendingOverdue) {
      byId.set(task.id, task);
    }
    for (const task of rejectedOverdue) {
      byId.set(task.id, task);
    }
    const overdueTasks = [...byId.values()].sort((a, b) => {
      const aDue = a.due_at ? new Date(a.due_at).getTime() : 0;
      const bDue = b.due_at ? new Date(b.due_at).getTime() : 0;
      return aDue - bDue;
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
          ledgerRepository,
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
