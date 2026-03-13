import { RRule, RRuleSet, rrulestr } from "rrule";
import { easternWallClockToUtcDate } from "@/lib/utils/eastern-time";

export interface ScheduleCalculation {
  dueAt: Date;
  unlockAt: Date;
}

/**
 * Calculates the next instance of a schedule.
 * @param recurrenceRule - RRule string (FREQ=...) or Legacy Number string ("7")
 * @param lastCompletedAt - Date of last completion (or creation)
 * @param leadTimeHours - How many hours before Due Date to unlock
 * @param referenceDate - Optional. If provided, the result must be strictly AFTER this date.
 * @returns { dueAt, unlockAt } or null if invalid
 */
export function calculateNextInstance(
  recurrenceRule: string,
  lastCompletedAt: Date,
  leadTimeHours: number = 24,
  referenceDate?: Date,
): ScheduleCalculation | null {
  try {
    const legacyDays = parseInt(recurrenceRule);
    const isLegacy = !isNaN(legacyDays) && !recurrenceRule.includes("=");

    let dueAt: Date;

    if (isLegacy) {
      // --- LEGACY MODE: Interval from Completion ---
      // Due = Completed + X Days
      // If referenceDate is provided, keep adding interval until > referenceDate
      dueAt = new Date(lastCompletedAt.getTime());

      do {
        dueAt.setDate(dueAt.getDate() + legacyDays);
      } while (referenceDate && dueAt <= referenceDate);
    } else {
      // --- RRULE MODE: Calendar Strict ---
      // We need to find the next occurrence AFTER the last completion.
      // Note: rrule.after(dt) returns the first recurrence > dt.
      let rule: RRule | RRuleSet;
      const hasExplicitDtstart = recurrenceRule.includes("DTSTART");

      if (hasExplicitDtstart) {
        try {
          rule = rrulestr(recurrenceRule);
        } catch {
          console.error("Invalid RRule string:", recurrenceRule);
          return null;
        }
      } else {
        try {
          // Force the rule to start "at the reference date" (or create a rule that effectively allows calculating from there)
          // If we don't provide dtstart, rrule uses 'now', which breaks if we are calculating for a past date
          // or if we want the cycle to be relative to the last completion.
          // using lastCompletedAt as start ensures 'after' finds the immediately next slot.
          const options = RRule.parseString(recurrenceRule);
          options.dtstart = lastCompletedAt;
          rule = new RRule(options);
        } catch {
          // Fallback or try rrulestr directly if manual parse fails (though parseString is the lower level)
          try {
            rule = rrulestr(recurrenceRule, { dtstart: lastCompletedAt });
          } catch {
            console.error("Invalid RRule string:", recurrenceRule);
            return null;
          }
        }
      }

      // Find next date strictly AFTER last completion (or reference date if provided)
      const basisDate =
        referenceDate && referenceDate > lastCompletedAt
          ? referenceDate
          : lastCompletedAt;

      const nextDate = rule.after(basisDate);

      if (!nextDate) {
        // No future occurrences (e.g., COUNT reached)
        return null;
      }
      const isEasternTimeZoneRule =
        recurrenceRule.includes("TZID=America/New_York");
      dueAt = isEasternTimeZoneRule
        ? normalizeEasternTzidOccurrence(nextDate, recurrenceRule)
        : nextDate;
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

function normalizeEasternTzidOccurrence(
  nextDate: Date,
  recurrenceRule: string,
): Date {
  const expectedClock = getExpectedEasternClock(recurrenceRule);
  if (!expectedClock) {
    return easternWallClockToUtcDate(nextDate);
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(nextDate);
  const easternHour = Number(parts.find((part) => part.type === "hour")?.value);
  const easternMinute = Number(
    parts.find((part) => part.type === "minute")?.value,
  );
  const easternSecond = Number(
    parts.find((part) => part.type === "second")?.value,
  );

  const matchesExpectedClock =
    easternHour === expectedClock.hour &&
    easternMinute === expectedClock.minute &&
    easternSecond === expectedClock.second;

  if (matchesExpectedClock) {
    return nextDate;
  }

  // Some environments return TZID recurrences as floating local times.
  // Reinterpret that wall clock as ET and convert to a UTC instant.
  return easternWallClockToUtcDate(nextDate);
}

function getExpectedEasternClock(
  recurrenceRule: string,
): { hour: number; minute: number; second: number } | null {
  const byHour = recurrenceRule.match(/BYHOUR=(\d{1,2})/);
  const byMinute = recurrenceRule.match(/BYMINUTE=(\d{1,2})/);
  const bySecond = recurrenceRule.match(/BYSECOND=(\d{1,2})/);

  if (byHour && byMinute) {
    return {
      hour: Number(byHour[1]),
      minute: Number(byMinute[1]),
      second: bySecond ? Number(bySecond[1]) : 0,
    };
  }

  const dtstart = recurrenceRule.match(/DTSTART(?:;TZID=[^:]+)?:\d{8}T(\d{2})(\d{2})(\d{2})/);
  if (dtstart) {
    return {
      hour: Number(dtstart[1]),
      minute: Number(dtstart[2]),
      second: Number(dtstart[3]),
    };
  }

  return null;
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
