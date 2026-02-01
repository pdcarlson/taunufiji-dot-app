/**
 * Notification Handler
 *
 * Listens for business domain events and sends notifications via Discord.
 */

import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import {
  TaskEvents,
  TaskCreatedEvent,
  TaskClaimedEvent,
  TaskSubmittedEvent,
  TaskApprovedEvent,
  TaskRejectedEvent,
  TaskReassignedEvent,
  TaskUnassignedEvent,
} from "@/lib/domain/events";
import { NotificationService } from "@/lib/application/services/notification.service";
import { logger } from "@/lib/utils/logger";

export const NotificationHandler = {
  init: () => {
    // Task Created → Notify assignee if pre-assigned
    DomainEventBus.subscribe<TaskCreatedEvent>(
      TaskEvents.TASK_CREATED,
      async (payload) => {
        if (payload.assignedTo) {
          logger.log(
            `[NotificationHandler] Notifying user ${payload.assignedTo} of new task: ${payload.title}`,
          );
          await NotificationService.sendNotification(
            payload.assignedTo,
            "assigned",
            {
              title: payload.title,
              taskId: payload.taskId,
            },
          );
        }
      },
    );

    // Task Claimed → Notify admin channel
    DomainEventBus.subscribe<TaskClaimedEvent>(
      TaskEvents.TASK_CLAIMED,
      async (payload) => {
        logger.log(
          `[NotificationHandler] Task claimed: ${payload.title} by ${payload.userId}`,
        );
        await NotificationService.notifyAdmins(
          `📋 Task claimed: **${payload.title}** by <@${payload.userId}>`,
          { taskId: payload.taskId },
        );
      },
    );

    // Task Submitted → Notify admins for review
    DomainEventBus.subscribe<TaskSubmittedEvent>(
      TaskEvents.TASK_SUBMITTED,
      async (payload) => {
        logger.log(
          `[NotificationHandler] Task submitted: ${payload.title} by ${payload.userId}`,
        );
        await NotificationService.notifyAdmins(
          `📤 Proof submitted for **${payload.title}** by <@${payload.userId}>. Ready for review.`,
          { taskId: payload.taskId },
        );
      },
    );

    // Task Approved → Notify user
    DomainEventBus.subscribe<TaskApprovedEvent>(
      TaskEvents.TASK_APPROVED,
      async (payload) => {
        if (payload.userId) {
          logger.log(
            `[NotificationHandler] Notifying user ${payload.userId} of approval: ${payload.title}`,
          );
          await NotificationService.sendNotification(
            payload.userId,
            "approved",
            {
              title: payload.title,
              taskId: payload.taskId,
              points: payload.points,
            },
          );
        }
      },
    );

    // Task Rejected → Notify user
    DomainEventBus.subscribe<TaskRejectedEvent>(
      TaskEvents.TASK_REJECTED,
      async (payload) => {
        if (payload.userId) {
          logger.log(
            `[NotificationHandler] Notifying user ${payload.userId} of rejection: ${payload.title}`,
          );
          await NotificationService.sendNotification(
            payload.userId,
            "rejected",
            {
              title: payload.title,
              taskId: payload.taskId,
              reason: payload.reason,
            },
          );
        }
      },
    );

    // Task Reassigned → Notify new user
    DomainEventBus.subscribe<TaskReassignedEvent>(
      TaskEvents.TASK_REASSIGNED,
      async (payload) => {
        logger.log(
          `[NotificationHandler] Notifying user ${payload.newUserId} of reassignment: ${payload.title}`,
        );
        await NotificationService.sendNotification(
          payload.newUserId,
          "assigned",
          {
            title: payload.title,
            taskId: payload.taskId,
          },
        );
      },
    );

    // Task Unassigned → Notify user
    DomainEventBus.subscribe<TaskUnassignedEvent>(
      TaskEvents.TASK_UNASSIGNED,
      async (payload) => {
        logger.log(
          `[NotificationHandler] Notifying user ${payload.userId} of unassignment: ${payload.title}`,
        );
        await NotificationService.sendNotification(
          payload.userId,
          "unassigned",
          {
            title: payload.title,
            taskId: payload.taskId,
          },
        );
      },
    );

    logger.log("[NotificationHandler] Subscribed to events.");
  },
};
