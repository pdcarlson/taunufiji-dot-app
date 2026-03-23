import { ILedgerRepository } from "@/lib/domain/ports/ledger.repository";

/** Embeds task id in ledger reason so we can detect duplicate fines without new task attributes. */
export function missedDutyFineReason(taskTitle: string, taskId: string): string {
  return `Missed Duty: ${taskTitle} [task:${taskId}]`;
}

export function missedDutyFineReasonContainsTaskId(
  reason: string,
  taskId: string,
): boolean {
  return reason.includes(`[task:${taskId}]`);
}

/**
 * True if a fine ledger row already exists for this task (idempotent retry / post-award failure recovery).
 */
export async function hasPersistedMissedDutyFine(
  ledgerRepository: ILedgerRepository,
  discordUserId: string,
  taskId: string,
): Promise<boolean> {
  const entries = await ledgerRepository.findMany({
    userId: discordUserId,
    category: "fine",
    limit: 200,
    orderBy: "timestamp",
    orderDirection: "desc",
  });
  return entries.some((e) =>
    missedDutyFineReasonContainsTaskId(e.reason, taskId),
  );
}
