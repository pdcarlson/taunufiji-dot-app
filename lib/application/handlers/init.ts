/**
 * Handler Registration
 *
 * Initializes all domain event handlers.
 * Import and call this once at application startup.
 */

import { PointsHandler } from "./points.handler";
import { NotificationHandler } from "./notification.handler";

let initialized = false;

export function initHandlers() {
  if (initialized) return;

  PointsHandler.init();
  NotificationHandler.init();

  initialized = true;
  console.log("[Handlers] All event handlers initialized.");
}
