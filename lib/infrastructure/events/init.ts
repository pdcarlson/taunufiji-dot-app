import { PointsHandler } from "./handlers/points.handler";
import { NotificationHandler } from "./handlers/notification.handler";

let initialized = false;

export function initDomainEvents() {
  if (initialized) return;

  PointsHandler.init();
  NotificationHandler.init();

  initialized = true;
  console.log("[DomainEvents] Handlers initialized.");
}
