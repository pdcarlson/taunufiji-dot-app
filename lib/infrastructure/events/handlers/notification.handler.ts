/**
 * Notification Handler
 *
 * Listens for business domain events and sends notifications via Discord.
 * Notifications are fire-and-forget from the event handler's perspective;
 * failures are logged but do not block business logic.
 */

import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import { TaskEvents } from "@/lib/domain/events";
import { NotificationService } from "@/lib/application/services/shared/notification.service";
import { logger } from "@/lib/utils/logger";

/**
 * Log a notification result for observability.
 */
function logResult(
  event: string,
  target: string,
  result: { success: boolean; error?: string },
) {
  if (!result.success) {
    logger.error(
      `[NotificationHandler] ${event} notification to ${target} failed: ${result.error}`,
    );
  }
}

export const NotificationHandler = {
  init: () => {
    // Task Created → Notify assignee if pre-assigned
    DomainEventBus.subscribe(TaskEvents.TASK_CREATED, async (payload) => {
      try {
        if (payload.assignedTo) {
          logger.log(
            `[NotificationHandler] Notifying user ${payload.assignedTo} of new task: ${payload.title}`,
          );
          const result = await NotificationService.sendNotification(
            payload.assignedTo,
            "assigned",
            {
              title: payload.title,
              taskId: payload.taskId,
            },
          );
          logResult("TASK_CREATED", payload.assignedTo, result);
        }
      } catch (error) {
        logger.error("[NotificationHandler] TASK_CREATED handler failed", {
          taskId: payload.taskId,
          assignedTo: payload.assignedTo,
          error,
        });
      }
    });

    // Task Submitted → Notify admins for review
    DomainEventBus.subscribe(TaskEvents.TASK_SUBMITTED, async (payload) => {
      try {
        logger.log(
          `[NotificationHandler] Task submitted: ${payload.title} by ${payload.userId}`,
        );
        const result = await NotificationService.notifyAdmins(
          `Proof submitted for **${payload.title}** by <@${payload.userId}>. Ready for review.`,
          { taskId: payload.taskId },
        );
        logResult("TASK_SUBMITTED", "admin_channel", result);
      } catch (error) {
        logger.error("[NotificationHandler] TASK_SUBMITTED handler failed", {
          taskId: payload.taskId,
          userId: payload.userId,
          error,
        });
      }
    });

    // Task Approved → Notify user
    DomainEventBus.subscribe(TaskEvents.TASK_APPROVED, async (payload) => {
      try {
        logger.log(
          `[NotificationHandler] Notifying user ${payload.userId} of approval: ${payload.title}`,
        );
        const result = await NotificationService.sendNotification(
          payload.userId,
          "approved",
          {
            title: payload.title,
            taskId: payload.taskId,
            points: payload.points,
          },
        );
        logResult("TASK_APPROVED", payload.userId, result);
        logger.log("[NotificationHandler] TASK_APPROVED sent", {
          userId: payload.userId,
          taskId: payload.taskId,
          title: payload.title,
          success: result.success,
        });
      } catch (error) {
        logger.error("[NotificationHandler] TASK_APPROVED handler failed", {
          taskId: payload.taskId,
          userId: payload.userId,
          error,
        });
      }
    });

    // Task Rejected → Notify user
    DomainEventBus.subscribe(TaskEvents.TASK_REJECTED, async (payload) => {
      try {
        if (payload.userId) {
          logger.log(
            `[NotificationHandler] Notifying user ${payload.userId} of rejection: ${payload.title}`,
          );
          const result = await NotificationService.sendNotification(
            payload.userId,
            "rejected",
            {
              title: payload.title,
              taskId: payload.taskId,
              reason: payload.reason,
            },
          );
          logResult("TASK_REJECTED", payload.userId, result);
        }
      } catch (error) {
        logger.error("[NotificationHandler] TASK_REJECTED handler failed", {
          taskId: payload.taskId,
          userId: payload.userId,
          error,
        });
      }
    });

    // Task Reassigned → Notify new user
    DomainEventBus.subscribe(TaskEvents.TASK_REASSIGNED, async (payload) => {
      try {
        logger.log(
          `[NotificationHandler] Notifying user ${payload.newUserId} of reassignment: ${payload.title}`,
        );
        const result = await NotificationService.sendNotification(
          payload.newUserId,
          "assigned",
          {
            title: payload.title,
            taskId: payload.taskId,
          },
        );
        logResult("TASK_REASSIGNED", payload.newUserId, result);
      } catch (error) {
        logger.error("[NotificationHandler] TASK_REASSIGNED handler failed", {
          taskId: payload.taskId,
          newUserId: payload.newUserId,
          error,
        });
      }
    });

    // Task Unassigned → Notify user
    DomainEventBus.subscribe(TaskEvents.TASK_UNASSIGNED, async (payload) => {
      try {
        logger.log(
          `[NotificationHandler] Notifying user ${payload.userId} of unassignment: ${payload.title}`,
        );
        const result = await NotificationService.sendNotification(
          payload.userId,
          "unassigned",
          {
            title: payload.title,
            taskId: payload.taskId,
          },
        );
        logResult("TASK_UNASSIGNED", payload.userId, result);
      } catch (error) {
        logger.error("[NotificationHandler] TASK_UNASSIGNED handler failed", {
          taskId: payload.taskId,
          userId: payload.userId,
          error,
        });
      }
    });

    logger.log("[NotificationHandler] Subscribed to events.");
  },
};
