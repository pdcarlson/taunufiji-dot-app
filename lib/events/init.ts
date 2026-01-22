import { PointsHandler } from "./handlers/points.handler";

let initialized = false;

export function initDomainEvents() {
  if (initialized) return;

  PointsHandler.init();
  // NotificationHandler.init(); // Future

  initialized = true;
  console.log("[DomainEvents] Handlers initialized.");
}
