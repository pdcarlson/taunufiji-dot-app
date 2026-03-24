import { HousingTask } from "@/lib/domain/entities";

/**
 * Assignee-facing task state helpers aligned with `spec/behavior.md`:
 * overdue mandatory work without proof should not appear user-actionable until expiry is persisted.
 */

/**
 * Whether the due timestamp is in the past.
 * Falsy `dueAt` is treated as not past due so ad-hoc or malformed rows are not forced through
 * overdue/expiry paths (see `spec/behavior.md` — overdue logic applies only when a real due time exists).
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

/**
 * Pending review with no proof uploaded yet — the window where cron may still expire the row if the
 * deadline passes (`spec/behavior.md`), and where assignee UIs should prompt for proof instead of treating
 * the chore as done.
 */
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
