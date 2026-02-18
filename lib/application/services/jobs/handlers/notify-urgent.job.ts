import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { NotificationService } from "@/lib/application/services/shared/notification.service";

export const NotifyUrgentJob = {
  async run(
    taskRepository: ITaskRepository,
  ): Promise<{ urgent: number; errors: string[] }> {
    const errors: string[] = [];
    let urgent = 0;
    const now = new Date();
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    try {
      const allOpenTasks = await taskRepository.findMany({
        status: "open",
        limit: 100,
      });

      // Filter for urgent candidates
      const urgentCandidates = allOpenTasks.filter((task) => {
        if (!task.due_at || !task.assigned_to) return false;
        const dueTime = new Date(task.due_at).getTime();
        return dueTime <= twelveHoursFromNow.getTime();
      });

      console.log(
        `⏰ Found ${urgentCandidates.length} candidates for urgent notification`,
      );

      for (const task of urgentCandidates) {
        try {
          if (task.type === "bounty") continue;
          if (
            task.notification_level !== "none" &&
            task.notification_level !== "unlocked"
          ) {
            continue;
          }

          // Send notification FIRST, update DB only on success
          const result = await NotificationService.sendNotification(
            task.assigned_to!,
            "urgent",
            {
              title: task.title,
              taskId: task.id,
            },
          );

          if (!result.success) {
            const errMsg = `Urgent DM failed for task ${task.id}: ${result.error}`;
            console.error(`[NotifyUrgentJob] ${errMsg}`);
            errors.push(errMsg);
            continue; // Don't update DB — retry next run
          }

          await taskRepository.update(task.id, {
            notification_level: "urgent",
          });

          urgent++;
        } catch (error: unknown) {
          const errMsg = `Failed to process urgent task ${task.id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errMsg);
          errors.push(errMsg);
        }
      }
    } catch (error: unknown) {
      const errMsg = `Failed to query urgent tasks: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errMsg);
      errors.push(errMsg);
    }

    return { urgent, errors };
  },
};
