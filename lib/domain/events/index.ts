/**
 * Domain Events Index
 *
 * Re-exports all domain events for convenient importing.
 */

// Task events
export {
  TaskEvents,
  type TaskCreatedEvent,
  type TaskClaimedEvent,
  type TaskSubmittedEvent,
  type TaskApprovedEvent,
  type TaskRejectedEvent,
  type TaskUnassignedEvent,
  type TaskUnlockedEvent,
  type TaskUrgentEvent,
  type TaskExpiredEvent,
  type TaskReassignedEvent,
  type TaskUpdatedEvent,
  type TaskEventMap,
} from "./task.events";

// Library events (keep for backwards compatibility)
export enum LibraryEvents {
  LIBRARY_UPLOADED = "library.uploaded",
}

export interface LibraryUploadedEvent {
  userId: string; // Discord ID of the uploader
  resourceId: string;
  fileName: string;
}
