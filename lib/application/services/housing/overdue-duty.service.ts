import { HOUSING_CONSTANTS } from "@/lib/constants";
import { HousingTask } from "@/lib/domain/types/task";
import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import { ScheduleService } from "./schedule.service";

type OverdueDutyDependencies = {
  taskRepository: ITaskRepository;
  pointsService: IPointsService;
  scheduleService: ScheduleService;
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
  });

  let fined = false;
  if (task.assigned_to) {
    try {
      await pointsService.awardPoints(task.assigned_to, {
        amount: -Math.abs(HOUSING_CONSTANTS.FINE_MISSING_DUTY),
        reason: `Missed Duty: ${task.title}`,
        category: "fine",
      });
      fined = true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Fine failed for ${task.id}: ${message}`);
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
