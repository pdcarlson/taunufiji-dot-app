/**
 * Task Domain Events
 *
 * All events related to task lifecycle.
 * These events are emitted by services and consumed by handlers.
 */

/**
 * Task Event Types
 */
export enum TaskEvents {
  // =========================================================================
  // Lifecycle Events (User Actions)
  // =========================================================================

  /** Task was created */
  TASK_CREATED = "task.created",

  /** Task was claimed by a user */
  TASK_CLAIMED = "task.claimed",

  /** Proof was submitted for a task */
  TASK_SUBMITTED = "task.submitted",

  /** Task was approved by admin */
  TASK_APPROVED = "task.approved",

  /** Task was rejected by admin */
  TASK_REJECTED = "task.rejected",

  /** Task was unclaimed by user or admin */
  TASK_UNASSIGNED = "task.unassigned",

  // =========================================================================
  // Cron Events (System Triggered)
  // =========================================================================

  /** Locked recurring task was unlocked */
  TASK_UNLOCKED = "task.unlocked",

  /** Task is due soon (< 12 hours) */
  TASK_URGENT = "task.urgent",

  /** Task expired without completion */
  TASK_EXPIRED = "task.expired",

  // =========================================================================
  // Admin Events
  // =========================================================================

  /** Task was reassigned to a different user */
  TASK_REASSIGNED = "task.reassigned",

  /** Task was updated by admin */
  TASK_UPDATED = "task.updated",
}

// ============================================================================
// Event Payloads
// ============================================================================

/**
 * Base payload for all task events
 */
interface BaseTaskEvent {
  taskId: string;
  title: string;
}

export interface TaskCreatedEvent extends BaseTaskEvent {
  type: "duty" | "bounty" | "project" | "one_off";
  assignedTo?: string; // Optional assignee
}

/**
 * Task claimed by a user
 */
export interface TaskClaimedEvent extends BaseTaskEvent {
  userId: string; // Discord ID of the user who claimed
}

/**
 * Proof submitted for review
 */
export interface TaskSubmittedEvent extends BaseTaskEvent {
  userId: string; // Discord ID of the submitter
}

/**
 * Task approved by admin
 */
export interface TaskApprovedEvent extends BaseTaskEvent {
  userId: string; // Discord ID of the user who completed
  points: number; // Points awarded
}

/**
 * Task rejected by admin
 */
export interface TaskRejectedEvent extends BaseTaskEvent {
  userId: string; // Discord ID of the task owner
  reason?: string; // Optional rejection reason
}

/**
 * Task unassigned (unclaimed or removed)
 */
export interface TaskUnassignedEvent extends BaseTaskEvent {
  userId: string; // Discord ID of the previous assignee
}

/**
 * Task unlocked (from locked to open)
 */
export interface TaskUnlockedEvent extends BaseTaskEvent {
  userId: string; // Discord ID of the assignee
}

/**
 * Task is urgent (due soon)
 */
export interface TaskUrgentEvent extends BaseTaskEvent {
  userId: string; // Discord ID of the assignee
  dueAt: string; // ISO timestamp of due date
}

/**
 * Task expired without completion
 */
export interface TaskExpiredEvent extends BaseTaskEvent {
  userId: string; // Discord ID of the assignee
  fineAmount: number; // Points deducted
}

/**
 * Task reassigned to a different user
 */
export interface TaskReassignedEvent extends BaseTaskEvent {
  previousUserId?: string; // Discord ID of the previous assignee
  newUserId: string; // Discord ID of the new assignee
}

/**
 * Task updated by admin
 */
export interface TaskUpdatedEvent extends BaseTaskEvent {
  userId?: string; // Discord ID of assignee (if any)
}

// ============================================================================
// Type Map for Handler Registration
// ============================================================================

/**
 * Maps event types to their payload types
 */
export interface TaskEventMap {
  [TaskEvents.TASK_CREATED]: TaskCreatedEvent;
  [TaskEvents.TASK_CLAIMED]: TaskClaimedEvent;
  [TaskEvents.TASK_SUBMITTED]: TaskSubmittedEvent;
  [TaskEvents.TASK_APPROVED]: TaskApprovedEvent;
  [TaskEvents.TASK_REJECTED]: TaskRejectedEvent;
  [TaskEvents.TASK_UNASSIGNED]: TaskUnassignedEvent;
  [TaskEvents.TASK_UNLOCKED]: TaskUnlockedEvent;
  [TaskEvents.TASK_URGENT]: TaskUrgentEvent;
  [TaskEvents.TASK_EXPIRED]: TaskExpiredEvent;
  [TaskEvents.TASK_REASSIGNED]: TaskReassignedEvent;
  [TaskEvents.TASK_UPDATED]: TaskUpdatedEvent;
}
