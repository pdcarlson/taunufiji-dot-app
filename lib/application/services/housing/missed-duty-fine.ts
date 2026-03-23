import { ILedgerRepository } from "@/lib/domain/ports/ledger.repository";

/** Embeds task id in ledger reason so we can detect duplicate fines without new task attributes. */
export function missedDutyFineReason(taskTitle: string, taskId: string): string {
  return `Missed Duty: ${taskTitle} [task:${taskId}]`;
}

export function missedDutyFineReasonContainsTaskId(
  reason: string,
  taskId: string,
): boolean {
  const marker = `[task:${taskId}]`;
  const trimmed = reason.trimEnd();
  return trimmed.endsWith(marker);
}

/**
 * True if a fine ledger row already exists for this task (idempotent retry / post-award failure recovery).
 * Pages through all matching fine rows so users with many fines cannot hide an older marker.
 */
export async function hasPersistedMissedDutyFine(
  ledgerRepository: ILedgerRepository,
  discordUserId: string,
  taskId: string,
): Promise<boolean> {
  const pageSize = 100;
  let offset = 0;
  for (;;) {
    const entries = await ledgerRepository.findMany({
      userId: discordUserId,
      category: "fine",
      limit: pageSize,
      offset,
      orderBy: "timestamp",
      orderDirection: "desc",
    });
    if (
      entries.some((e) =>
        missedDutyFineReasonContainsTaskId(e.reason, taskId),
      )
    ) {
      return true;
    }
    if (entries.length < pageSize) {
      return false;
    }
    offset += pageSize;
  }
}
