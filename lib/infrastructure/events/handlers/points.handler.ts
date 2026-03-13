import { DomainEventBus } from "../dispatcher";
import {
  LibraryEvents,
  TaskEvents,
} from "@/lib/domain/events";
import { logger } from "@/lib/utils/logger";
import { getContainer } from "@/lib/infrastructure/container";

/**
 * PointsHandler
 * Listens for business events and awards points.
 */
export const PointsHandler = {
  init: () => {
    // 1. Library Uploads
    DomainEventBus.subscribe(LibraryEvents.LIBRARY_UPLOADED, async (payload) => {
        logger.log(
          `[PointsHandler] Awarding points for Library Upload: ${payload.fileName}`,
        );
        const { pointsService } = getContainer();
        await pointsService.awardPoints(payload.userId, {
          amount: 10,
          reason: "Uploaded Exam",
          category: "event", // Keeping 'event' as per legacy, or could use 'task'
        });
      });

    // 2. Task Approved
    DomainEventBus.subscribe(TaskEvents.TASK_APPROVED, async (payload) => {
        logger.log(
          `[PointsHandler] Awarding points for Task Approved: ${payload.title}`,
        );
        const { pointsService } = getContainer();
        await pointsService.awardPoints(payload.userId, {
          amount: payload.points,
          reason: payload.title,
          category: "task",
        });
      });

    logger.log("[PointsHandler] Subscribed to events.");
  },
};
