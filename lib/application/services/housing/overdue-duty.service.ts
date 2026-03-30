import { HOUSING_CONSTANTS } from "@/lib/constants";
import { HousingTask } from "@/lib/domain/types/task";
import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import { IScheduleService } from "@/lib/domain/ports/services/schedule.service.port";
import { ILedgerRepository } from "@/lib/domain/ports/ledger.repository";
import {
  hasPersistedMissedDutyFine,
  missedDutyFineReason,
} from "./missed-duty-fine";

type OverdueDutyDependencies = {
  taskRepository: ITaskRepository;
  pointsService: IPointsService;
  scheduleService: IScheduleService;
  ledgerRepository: ILedgerRepository;
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

const EXPIRABLE_STATUSES: HousingTask["status"][] = [
  "open",
  "pending",
  "rejected",
];

function isEligibleForDutyExpiry(row: HousingTask, now: Date): boolean {
  if (NON_EXPIRABLE_TYPES.includes(row.type)) {
    return false;
  }
  if (!row.due_at || new Date(row.due_at) > now) {
    return false;
  }
  if (!EXPIRABLE_STATUSES.includes(row.status)) {
    return false;
  }
  if (row.proof_s3_key) {
    return false;
  }
  return true;
}

/**
 * Expires a single overdue duty-like task and applies all required side effects.
 * This centralizes behavior so cron and maintenance stay consistent.
 * Re-reads the live row before mutating so a stale cron/maintenance snapshot
 * cannot expire a task that was approved or received proof in the meantime.
 */
export async function expireOverdueDutyTask(
  task: HousingTask,
  dependencies: OverdueDutyDependencies,
): Promise<OverdueDutyResult> {
  const { taskRepository, pointsService, scheduleService, ledgerRepository } =
    dependencies;
  const errors: string[] = [];
  const now = new Date();

  const fresh = await taskRepository.findById(task.id);
  if (!fresh) {
    return {
      expired: false,
      fined: false,
      triggeredNextInstance: false,
      errors,
    };
  }

  if (!isEligibleForDutyExpiry(fresh, now)) {
    return {
      expired: false,
      fined: false,
      triggeredNextInstance: false,
      errors,
    };
  }

  await taskRepository.update(fresh.id, {
    status: "expired",
    ...(fresh.assigned_to ? { is_fine: false } : {}),
  });

  const taskAfterExpire: HousingTask = { ...fresh, status: "expired" };

  let fined = false;
  if (fresh.assigned_to) {
    try {
      const alreadyFined = await hasPersistedMissedDutyFine(
        ledgerRepository,
        fresh.assigned_to,
        fresh.id,
      );
      if (alreadyFined) {
        await taskRepository.update(fresh.id, { is_fine: true });
        fined = true;
      } else {
        await pointsService.awardPoints(fresh.assigned_to, {
          amount: -Math.abs(HOUSING_CONSTANTS.FINE_MISSING_DUTY),
          reason: missedDutyFineReason(fresh.title, fresh.id),
          category: "fine",
          fineTaskId: fresh.id,
        });
        await taskRepository.update(fresh.id, { is_fine: true });
        fined = true;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Fine failed for ${fresh.id}: ${message}`);
      await taskRepository
        .update(fresh.id, { is_fine: false })
        .catch(() => undefined);
    }
  }

  let triggeredNextInstance = false;
  if (fresh.schedule_id) {
    try {
      await scheduleService.triggerNextInstance(
        fresh.schedule_id,
        taskAfterExpire,
      );
      triggeredNextInstance = true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Scheduler failed for ${fresh.id}: ${message}`);
    }
  }

  return {
    expired: true,
    fined,
    triggeredNextInstance,
    errors,
  };
}
