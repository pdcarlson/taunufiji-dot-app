import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import { TaskEvents } from "@/lib/domain/events";
import { getContainer } from "@/lib/infrastructure/container";
import { logger } from "@/lib/utils/logger";

export const TaskExpiredHandler = {
  init: () => {
    // Task Expired -> Trigger Next Instance
    DomainEventBus.subscribe(TaskEvents.TASK_EXPIRED, async (payload) => {
      logger.log(
        `[TaskExpiredHandler] Task expired: ${payload.title} (${payload.taskId})`,
      );

      try {
        const { taskRepository } = getContainer();
        const task = await taskRepository.findById(payload.taskId);

        if (task && task.schedule_id) {
          logger.log(
            `[TaskExpiredHandler] Triggering next instance for schedule ${task.schedule_id}`,
          );
          const { scheduleService } = getContainer();
          await scheduleService.triggerNextInstance(task.schedule_id, task);
        }
      } catch (e) {
        logger.error("[TaskExpiredHandler] Failed to handle expiry", e);
      }
    });
  },
};
