/**
 * Notification Handler
 *
 * Listens for business domain events and sends notifications via Discord.
 * Notifications are fire-and-forget from the event handler's perspective;
 * failures are logged but do not block business logic.
 */

import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import {
  TaskEvents,
} from "@/lib/domain/events";
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
      });

    // Task Claimed → Notify admin channel
    DomainEventBus.subscribe(TaskEvents.TASK_CLAIMED, async (payload) => {
        logger.log(
          `[NotificationHandler] Task claimed: ${payload.title} by ${payload.userId}`,
        );
        const result = await NotificationService.notifyAdmins(
          `📋 Task claimed: **${payload.title}** by <@${payload.userId}>`,
          { taskId: payload.taskId },
        );
        logResult("TASK_CLAIMED", "admin_channel", result);
      });

    // Task Submitted → Notify admins for review
    DomainEventBus.subscribe(TaskEvents.TASK_SUBMITTED, async (payload) => {
        logger.log(
          `[NotificationHandler] Task submitted: ${payload.title} by ${payload.userId}`,
        );
        const result = await NotificationService.notifyAdmins(
          `📤 Proof submitted for **${payload.title}** by <@${payload.userId}>. Ready for review.`,
          { taskId: payload.taskId },
        );
        logResult("TASK_SUBMITTED", "admin_channel", result);
      });

    // Task Approved → Notify user
    DomainEventBus.subscribe(TaskEvents.TASK_APPROVED, async (payload) => {
        if (payload.userId) {
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
        }
      });

    // Task Rejected → Notify user
    DomainEventBus.subscribe(TaskEvents.TASK_REJECTED, async (payload) => {
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
      });

    // Task Reassigned → Notify new user
    DomainEventBus.subscribe(TaskEvents.TASK_REASSIGNED, async (payload) => {
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
      });

    // Task Unassigned → Notify user
    DomainEventBus.subscribe(TaskEvents.TASK_UNASSIGNED, async (payload) => {
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
      });

    logger.log("[NotificationHandler] Subscribed to events.");
  },
};
