/**
 * Maintenance Service
 *
 * Per-user fallback when cron has not run yet: unlock eligible tasks, expire overdue duties (same path as
 * `expireOverdueDutyTask` / cron), and unclaim expired bounties. Does **not** duplicate recurring/urgent/expired
 * Discord notifications or `ensureFutureTasksJob` — those stay in the platform-scheduled housing batch
 * (`housing-time-driven.pipeline.ts`).
 */

import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { ILedgerRepository } from "@/lib/domain/ports/ledger.repository";
import { IDutyService } from "@/lib/domain/ports/services/duty.service.port";
import { IPointsService } from "@/lib/domain/ports/services/points.service.port";
import { IScheduleService } from "@/lib/domain/ports/services/schedule.service.port";
import { expireOverdueDutyTask } from "./overdue-duty.service";
import { processUnlockForTask } from "./task-unlock";

export class MaintenanceService {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly dutyService: IDutyService,
    private readonly pointsService: IPointsService,
    private readonly scheduleService: IScheduleService,
    private readonly ledgerRepository: ILedgerRepository,
  ) {}

  /**
   * Run maintenance checks for a specific user's assignments.
   * Checks for:
   * 1. Locked tasks that should open.
   * 2. Overdue tasks that should expire.
   * 3. Overdue bounties that should unclaim.
   */
  async performMaintenance(userId: string): Promise<void> {
    const allAssigned = await this.taskRepository.findByAssignee(userId);
    const now = new Date();

    const maintenancePromises: Promise<void>[] = [];

    for (const task of allAssigned) {
      maintenancePromises.push(
        (async () => {
          // Filter A: Approved (Hidden) or already Expired
          if (task.status === "approved" || task.status === "expired") {
            return;
          }

          // Check B: Stuck in "Locked" but Time Passed (same rules/notifications as UnlockTasksJob)
          if (task.status === "locked") {
            const unlockResult = await processUnlockForTask(
              this.taskRepository,
              task,
              now,
            );
            if (unlockResult.errors.length > 0) {
              console.error("[MaintenanceService] Unlock errors", {
                taskId: task.id,
                errors: unlockResult.errors,
              });
            }
            if (unlockResult.unlocked) {
              return;
            }
          }

          // Check C: Open/Pending but Expired (Duty)
          if (
            task.status !== "rejected" &&
            task.type !== "bounty" &&
            task.due_at &&
            now > new Date(task.due_at) &&
            !task.proof_s3_key
          ) {
            const result = await expireOverdueDutyTask(task, {
              taskRepository: this.taskRepository,
              pointsService: this.pointsService,
              scheduleService: this.scheduleService,
              ledgerRepository: this.ledgerRepository,
            });
            if (result.errors.length > 0) {
              console.error("[MaintenanceService] Overdue processing errors", {
                taskId: task.id,
                scheduleId: task.schedule_id ?? null,
                errors: result.errors,
              });
            }
            if (result.expired) {
              console.log("[MaintenanceService]", {
                phase: "task_expired",
                taskId: task.id,
                scheduleId: task.schedule_id ?? null,
                fined: result.fined,
                triggeredNextInstance: result.triggeredNextInstance,
              });
              return;
            }
            console.log("[MaintenanceService]", {
              phase: "task_expire_skipped",
              taskId: task.id,
              type: task.type,
              status: task.status,
            });
          }

          // Check D: Open Bounty but Expired (Assigned)
          if (
            task.type === "bounty" &&
            task.status !== "open" &&
            task.due_at &&
            now > new Date(task.due_at)
          ) {
            // Expired Claim -> Unclaim
            await this.dutyService.unclaimTask(task.id, userId);
            return;
          }
        })(),
      );
    }

    await Promise.all(maintenancePromises);
  }
}
