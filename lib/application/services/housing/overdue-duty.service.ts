import { HOUSING_CONSTANTS } from "@/lib/constants";
import { HousingTask } from "@/lib/domain/types/task";
import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import { IScheduleService } from "@/lib/domain/ports/services/schedule.service.port";

type OverdueDutyDependencies = {
  taskRepository: ITaskRepository;
  pointsService: IPointsService;
  scheduleService: IScheduleService;
};

type OverdueDutyResult = {
  expired: boolean;
  fined: boolean;
  triggeredNextInstance: boolean;
  errors: string[];
};

const NON_EXPIRABLE_TYPES: HousingTask["type"][] = [
  "bounty",
  "project",
  "ad_hoc",
];

/**
 * Expires a single overdue duty-like task and applies all required side effects.
 * This centralizes behavior so cron and maintenance stay consistent.
 */
export async function expireOverdueDutyTask(
  task: HousingTask,
  dependencies: OverdueDutyDependencies,
): Promise<OverdueDutyResult> {
  const { taskRepository, pointsService, scheduleService } = dependencies;
  const errors: string[] = [];

  if (NON_EXPIRABLE_TYPES.includes(task.type)) {
    return {
      expired: false,
      fined: false,
      triggeredNextInstance: false,
      errors,
    };
  }

  if (!task.due_at || new Date(task.due_at) > new Date()) {
    return {
      expired: false,
      fined: false,
      triggeredNextInstance: false,
      errors,
    };
  }

  if (task.proof_s3_key) {
    return {
      expired: false,
      fined: false,
      triggeredNextInstance: false,
      errors,
    };
  }

  await taskRepository.update(task.id, {
    status: "expired",
    ...(task.assigned_to ? { is_fine: false } : {}),
  });

  let fined = false;
  if (task.assigned_to) {
    try {
      await pointsService.awardPoints(task.assigned_to, {
        amount: -Math.abs(HOUSING_CONSTANTS.FINE_MISSING_DUTY),
        reason: `Missed Duty: ${task.title}`,
        category: "fine",
      });
      await taskRepository.update(task.id, { is_fine: true });
      fined = true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Fine failed for ${task.id}: ${message}`);
      await taskRepository
        .update(task.id, { is_fine: false })
        .catch(() => undefined);
    }
  }

  let triggeredNextInstance = false;
  if (task.schedule_id) {
    try {
      await scheduleService.triggerNextInstance(task.schedule_id, task);
      triggeredNextInstance = true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Scheduler failed for ${task.id}: ${message}`);
    }
  }

  return {
    expired: true,
    fined,
    triggeredNextInstance,
    errors,
  };
}
