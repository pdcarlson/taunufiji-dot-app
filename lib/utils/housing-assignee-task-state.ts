import { HousingTask } from "@/lib/domain/entities";

/**
 * Assignee-facing task state helpers aligned with `docs/behavior.md`:
 * overdue mandatory work without proof should not appear user-actionable until expiry is persisted.
 */

export function isPastDueAt(
  dueAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!dueAt) {
    return false;
  }
  return now > new Date(dueAt);
}

export function isPendingWithoutProof(task: HousingTask): boolean {
  return task.status === "pending" && !task.proof_s3_key;
}

/**
 * Overdue `open` or `pending` with no proof: waiting for cron/maintenance to mark `expired`.
 */
export function isAwaitingExpiryTransition(
  task: HousingTask,
  now: Date = new Date(),
): boolean {
  const actionable =
    task.status === "open" || task.status === "pending";
  return (
    actionable &&
    !task.proof_s3_key &&
    isPastDueAt(task.due_at, now)
  );
}

/** Assignee cannot complete (missed deadline or expiry not yet written). */
export function isAssigneeNotCompletable(task: HousingTask, now?: Date): boolean {
  return task.status === "expired" || isAwaitingExpiryTransition(task, now);
}
