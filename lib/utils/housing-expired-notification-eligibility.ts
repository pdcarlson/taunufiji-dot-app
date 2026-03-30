import { HousingTask } from "@/lib/domain/entities";

/**
 * Whether an `expired` row should still receive the "missed task" Discord/DM path.
 * Proof on the document means the assignee submitted before we treat the case as a true miss
 * (stale `status` or race with cron should not ping).
 */
export function shouldSendMissedTaskNotification(task: HousingTask): boolean {
  if (task.status !== "expired") {
    return false;
  }
  if (task.proof_s3_key) {
    return false;
  }
  return true;
}
