import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import { TaskEvents, TaskExpiredEvent } from "@/lib/domain/events";
import { getContainer } from "@/lib/infrastructure/container";
import { logger } from "@/lib/utils/logger";

export const TaskExpiredHandler = {
  init: () => {
    // Task Expired -> Trigger Next Instance
    DomainEventBus.subscribe<TaskExpiredEvent>(
      TaskEvents.TASK_EXPIRED,
      async (payload) => {
        logger.log(
          `[TaskExpiredHandler] Task expired: ${payload.title} (${payload.taskId})`,
        );

        // We need to fetch the task to get the schedule_id
        // Payload currently only has basic info.
        // ideally payload should have scheduleId, but if not we fetch.
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
      },
    );
  },
};
