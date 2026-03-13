import { describe, expect, it } from "vitest";
import { calculateNextInstance } from "./scheduler";

describe("calculateNextInstance", () => {
  it("supports legacy numeric recurrence rules", () => {
    const lastCompletedAt = new Date("2026-01-01T00:00:00.000Z");
    const result = calculateNextInstance("7", lastCompletedAt, 24);

    expect(result).not.toBeNull();
    expect(result?.dueAt.toISOString()).toBe("2026-01-08T00:00:00.000Z");
    expect(result?.unlockAt.toISOString()).toBe("2026-01-07T00:00:00.000Z");
  });

  it("preserves timezone-aware DTSTART rules without overriding dtstart", () => {
    const recurrenceRule =
      "DTSTART;TZID=America/New_York:20260301T235900\nRRULE:FREQ=WEEKLY;BYDAY=MO";
    const lastCompletedAt = new Date("2026-03-07T00:00:00.000Z");
    const result = calculateNextInstance(recurrenceRule, lastCompletedAt, 24);

    expect(result).not.toBeNull();
    // Scheduler uses rrule TZID output as UTC; unlock is 24h before due
    // 23:59 ET after DST (Mar 2026) = 03:59 UTC next day
    expect(result?.dueAt.toISOString()).toBe("2026-03-10T03:59:00.000Z");
    expect(result?.unlockAt.toISOString()).toBe("2026-03-09T03:59:00.000Z");
  });
});
