import {
  DomainEventBus,
  DomainEvents,
  LibraryUploadedEvent,
  TaskApprovedEvent,
} from "../dispatcher";
import { PointsService } from "@/lib/services/points.service";
import { logger } from "@/lib/logger";

/**
 * PointsHandler
 * Listens for business events and awards points.
 */
export const PointsHandler = {
  init: () => {
    // 1. Library Uploads
    DomainEventBus.subscribe<LibraryUploadedEvent>(
      DomainEvents.LIBRARY_UPLOADED,
      async (payload) => {
        logger.log(
          `[PointsHandler] Awarding points for Library Upload: ${payload.fileName}`,
        );
        await PointsService.awardPoints(payload.userId, {
          amount: 10,
          reason: "Uploaded Exam",
          category: "event", // Keeping 'event' as per legacy, or could use 'task'
        });
      },
    );

    // 2. Task Approved
    DomainEventBus.subscribe<TaskApprovedEvent>(
      DomainEvents.TASK_APPROVED,
      async (payload) => {
        logger.log(
          `[PointsHandler] Awarding points for Task Approved: ${payload.taskTitle}`,
        );
        await PointsService.awardPoints(payload.userId, {
          amount: payload.points,
          reason: payload.taskTitle,
          category: "task",
        });
      },
    );

    logger.log("[PointsHandler] Subscribed to events.");
  },
};
