import {
  DUE_TIME_LABEL,
  EASTERN_TIME_ZONE,
  buildWeeklyEasternRecurrenceRule,
  easternDateInputToIso,
  getTodayEasternDateInput,
  isoToEasternDateInput,
} from "./eastern-time";
import { calculateNextInstance } from "./scheduler";

describe("eastern-time utilities", () => {
  it("converts ET date input to ET end-of-day ISO", () => {
    const iso = easternDateInputToIso("2026-03-10");
    expect(iso).toBe("2026-03-11T03:59:00.000Z");
  });

  it("labels due dates with the wall-clock time they are stored at", () => {
    const stored = new Date(easternDateInputToIso("2026-10-12"));
    const shown = stored.toLocaleTimeString("en-US", {
      timeZone: EASTERN_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
    });
    expect(DUE_TIME_LABEL).toBe(`${shown} ET`);
  });

  it("round-trips ET ISO to date input", () => {
    const dateInput = isoToEasternDateInput("2026-03-11T03:59:00.000Z");
    expect(dateInput).toBe("2026-03-10");
  });

  it("generates weekly ET recurrence rules", () => {
    const rule = buildWeeklyEasternRecurrenceRule("FR");
    expect(rule).toContain("DTSTART;TZID=America/New_York");
    expect(rule).toContain("RRULE:FREQ=WEEKLY;BYDAY=FR");
  });

  it("builds scheduler dates across DST boundary", () => {
    const rule = buildWeeklyEasternRecurrenceRule("SU");
    const result = calculateNextInstance(
      rule,
      new Date("2026-03-07T00:00:00.000Z"),
      24,
    );

    expect(result).not.toBeNull();
    // Scheduler uses rrule TZID output as UTC; unlock is 24h before due
    // 23:59 ET after DST (Mar 2026) = 03:59 UTC next day
    expect(result?.dueAt.toISOString()).toBe("2026-03-09T03:59:00.000Z");
    expect(result?.unlockAt.toISOString()).toBe("2026-03-08T03:59:00.000Z");
  });

  it("returns ET-formatted today date input", () => {
    expect(getTodayEasternDateInput()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
