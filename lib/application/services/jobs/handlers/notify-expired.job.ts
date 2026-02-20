import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { NotificationService } from "@/lib/application/services/shared/notification.service";

export const NotifyExpiredJob = {
  async run(
    taskRepository: ITaskRepository,
  ): Promise<{
    expired_notified: number;
    skipped_unassigned: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let expired_notified = 0;
    let skipped_unassigned = 0;

    try {
      const expiredTasks = await taskRepository.findMany({
        status: "expired",
        limit: 100,
      });

      // Filter to only those not yet notified
      const tasksToNotify = expiredTasks.filter(
        (task) => task.notification_level !== "expired",
      );

      console.log(
        `📢 Found ${tasksToNotify.length} expired tasks needing notification`,
      );

      for (const task of tasksToNotify) {
        try {
          if (task.type === "bounty") continue;

          if (!task.assigned_to) {
            console.warn(
              `[NotifyExpiredJob] Task ${task.id} ("${task.title}") has no assigned_to — skipping notification, marking as notified`,
            );
            await taskRepository.update(task.id, {
              notification_level: "expired",
            });
            skipped_unassigned++;
            continue;
          }

          // 1. Notify Admins (Channel)
          const channelResult = await NotificationService.notifyAdmins(
            `🚨 **MISSED TASK**: <@${task.assigned_to}> failed to complete **${task.title}**. Task expired.
            https://tenor.com/view/what%27s-this-barn-owl-robert-e-fuller-what%27s-here-this-is-unfamiliar-gif-17821474186565185401`,
          );

          if (!channelResult.success) {
            const errMsg = `Channel notification failed for task ${task.id}: ${channelResult.error}`;
            console.error(`[NotifyExpiredJob] ${errMsg}`);
            errors.push(errMsg);
          }

          // 2. Notify User (DM) - Critical
          const dmResult = await NotificationService.sendNotification(
            task.assigned_to,
            "expired",
            {
              title: task.title,
              taskId: task.id,
            },
          );

          if (!dmResult.success) {
            const errMsg = `DM to user ${task.assigned_to} failed for task ${task.id}: ${dmResult.error}`;
            console.error(`[NotifyExpiredJob] ${errMsg}`);
            errors.push(errMsg);
            continue; // Skip DB update — retry next run
          }

          // 3. Mark as Notified only if DM succeeded
          await taskRepository.update(task.id, {
            notification_level: "expired",
          });

          expired_notified++;
        } catch (error: unknown) {
          const errMsg = `Failed to notify expired task ${task.id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    } catch (error: unknown) {
      const errMsg = `Failed to query expired tasks: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }

    return { expired_notified, skipped_unassigned, errors };
  },
};
