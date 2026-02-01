/**
 * Maintenance Service
 *
 * Handles state updates for tasks that depend on time (Expiry, Unlocking).
 * Previously hidden inside DutyService.getMyTasks (Lazy Eval).
 */

import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { IDutyService } from "@/lib/domain/ports/services/duty.service.port";
import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import { TaskEvents } from "@/lib/domain/events";

export class MaintenanceService {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly dutyService: IDutyService,
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

    for (const task of allAssigned) {
      // Filter A: Approved (Hidden) or already Expired
      if (task.status === "approved" || task.status === "expired") {
        continue;
      }

      // Check B: Stuck in "Locked" but Time Passed
      if (
        task.status === "locked" &&
        task.unlock_at &&
        now >= new Date(task.unlock_at)
      ) {
        await this.taskRepository.update(task.$id, {
          status: "open",
          notification_level: "unlocked",
        });
        continue;
      }

      // Check C: Open/Pending but Expired (Duty)
      if (
        task.status !== "rejected" &&
        task.type !== "bounty" &&
        task.due_at &&
        now > new Date(task.due_at) &&
        !task.proof_s3_key
      ) {
        // IT IS EXPIRED
        await this.taskRepository.update(task.$id, {
          status: "expired",
        });

        // Emit Event
        await DomainEventBus.publish(TaskEvents.TASK_EXPIRED, {
          taskId: task.$id,
          title: task.title,
          userId: userId,
          fineAmount: 50,
        });
        continue;
      }

      // Check D: Open Bounty but Expired (Assigned)
      if (
        task.type === "bounty" &&
        task.status !== "open" &&
        task.due_at &&
        now > new Date(task.due_at)
      ) {
        // Expired Claim -> Unclaim
        await this.dutyService.unclaimTask(task.$id, userId);
        continue;
      }
    }
  }
}
