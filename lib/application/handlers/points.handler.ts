/**
 * Points Handler
 *
 * Listens for business domain events and awards/deducts points.
 */

import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import {
  TaskEvents,
  TaskApprovedEvent,
  TaskExpiredEvent,
  LibraryEvents,
  LibraryUploadedEvent,
} from "@/lib/domain/events";
import { PointsService } from "@/lib/application/services/points.service";
import { logger } from "@/lib/utils/logger";

export const PointsHandler = {
  init: () => {
    // 1. Library Uploads
    DomainEventBus.subscribe<LibraryUploadedEvent>(
      LibraryEvents.LIBRARY_UPLOADED,
      async (payload) => {
        logger.log(
          `[PointsHandler] Awarding points for Library Upload: ${payload.fileName}`,
        );
        await PointsService.awardPoints(payload.userId, {
          amount: 10,
          reason: "Uploaded Exam",
          category: "event",
        });
      },
    );

    // 2. Task Approved → Award points
    DomainEventBus.subscribe<TaskApprovedEvent>(
      TaskEvents.TASK_APPROVED,
      async (payload) => {
        logger.log(
          `[PointsHandler] Awarding points for Task Approved: ${payload.title}`,
        );
        await PointsService.awardPoints(payload.userId, {
          amount: payload.points,
          reason: payload.title,
          category: "task",
        });
      },
    );

    // 3. Task Expired → Deduct fine
    DomainEventBus.subscribe<TaskExpiredEvent>(
      TaskEvents.TASK_EXPIRED,
      async (payload) => {
        logger.log(
          `[PointsHandler] Deducting fine for Task Expired: ${payload.title}`,
        );
        await PointsService.awardPoints(payload.userId, {
          amount: -payload.fineAmount,
          reason: `Missed Duty: ${payload.title}`,
          category: "fine",
        });
      },
    );

    logger.log("[PointsHandler] Subscribed to events.");
  },
};
