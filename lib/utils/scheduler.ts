import { RRule, RRuleSet, rrulestr } from "rrule";

export interface ScheduleCalculation {
  dueAt: Date;
  unlockAt: Date;
}

/**
 * Calculates the next instance of a schedule.
 * @param recurrenceRule - RRule string (FREQ=...) or Legacy Number string ("7")
 * @param lastCompletedAt - Date of last completion (or creation)
 * @param leadTimeHours - How many hours before Due Date to unlock
 * @returns { dueAt, unlockAt } or null if invalid
 */
export function calculateNextInstance(
  recurrenceRule: string,
  lastCompletedAt: Date,
  leadTimeHours: number = 24,
): ScheduleCalculation | null {
  try {
    const legacyDays = parseInt(recurrenceRule);
    const isLegacy = !isNaN(legacyDays) && !recurrenceRule.includes("=");

    let dueAt: Date;

    if (isLegacy) {
      // --- LEGACY MODE: Interval from Completion ---
      // Due = Completed + X Days
      dueAt = new Date(lastCompletedAt.getTime());
      dueAt.setDate(dueAt.getDate() + legacyDays);
    } else {
      // --- RRULE MODE: Calendar Strict ---
      // We need to find the next occurrence AFTER the last completion.
      // Note: rrule.after(dt) returns the first recurrence > dt.
      let rule: RRule | RRuleSet;
      try {
        // Force the rule to start "at the reference date" (or create a rule that effectively allows calculating from there)
        // If we don't provide dtstart, rrule uses 'now', which breaks if we are calculating for a past date
        // or if we want the cycle to be relative to the last completion.
        // using lastCompletedAt as start ensures 'after' finds the immediately next slot.
        const options = RRule.parseString(recurrenceRule);
        options.dtstart = lastCompletedAt;
        rule = new RRule(options);
      } catch (e) {
        // Fallback or try rrulestr directly if manual parse fails (though parseString is the lower level)
        try {
          rule = rrulestr(recurrenceRule, { dtstart: lastCompletedAt });
        } catch {
          console.error("Invalid RRule string:", recurrenceRule);
          return null;
        }
      }

      // Find next date strictly AFTER last completion
      const nextDate = rule.after(lastCompletedAt);

      if (!nextDate) {
        // No future occurrences (e.g., COUNT reached)
        return null;
      }
      dueAt = nextDate;
    }

    // --- UNLOCK CALCULATION ---
    // Unlock strictly 'leadTimeHours' before Due.
    // e.g., Due Fri 5pm, Lead 24h -> Unlock Thu 5pm.
    const unlockAt = new Date(dueAt.getTime() - leadTimeHours * 60 * 60 * 1000);

    return {
      dueAt,
      unlockAt,
    };
  } catch (e) {
    console.error("Scheduler Error:", e);
    return null;
  }
}

/**
 * Generates a human-readable text from an RRule string
 */
export function toText(recurrenceRule: string): string {
  const legacyDays = parseInt(recurrenceRule);
  if (!isNaN(legacyDays) && !recurrenceRule.includes("=")) {
    return `Every ${legacyDays} days`;
  }
  try {
    return rrulestr(recurrenceRule).toText();
  } catch {
    return "Invalid Schedule";
  }
}
