export const EASTERN_TIME_ZONE = "America/New_York";
/** Stable reference datetime (YYYYMMDDTHHMMSS) for RRULE/weekly recurrence in Eastern time. End-of-day 2024-01-01 avoids DST edge cases and gives a deterministic week boundary; used with EASTERN_TIME_ZONE for consistent recurrence calculations. */
const EASTERN_REFERENCE_START = "20240101T235900";

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getDatePartsInEastern(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!year || !month || !day) {
    throw new Error("Failed to resolve date parts in Eastern time.");
  }

  return { year, month, day };
}

export function easternDateInputToIso(dateInput: string): string {
  const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date input: ${dateInput}`);
  }

  const [, yearString, monthString, dayString] = match;
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const maxDay = getDaysInMonth(year, month);

  if (month < 1 || month > 12 || day < 1 || day > maxDay) {
    throw new Error(`Invalid calendar date input: ${dateInput}`);
  }

  const occurrence = zonedTimeToUtc(
    year,
    month,
    day,
    23,
    59,
    0,
    EASTERN_TIME_ZONE,
  );

  return occurrence.toISOString();
}

export function isoToEasternDateInput(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  const { year, month, day } = getDatePartsInEastern(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function getTodayEasternDateInput(): string {
  const { year, month, day } = getDatePartsInEastern(new Date());
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function buildWeeklyEasternRecurrenceRule(dayCode: string): string {
  return `DTSTART;TZID=${EASTERN_TIME_ZONE}:${EASTERN_REFERENCE_START}\nRRULE:FREQ=WEEKLY;BYDAY=${dayCode};BYHOUR=23;BYMINUTE=59;BYSECOND=0`;
}

/**
 * Interprets a Date's UTC components as Eastern wall-clock values and converts
 * that local Eastern timestamp into the corresponding UTC Date.
 *
 * Expected input: a Date where `getUTCFullYear/Month/Date/Hours/Minutes/Seconds`
 * represent the intended Eastern local time (not an actual UTC instant).
 * Returns: the true UTC Date for that Eastern local timestamp via
 * `zonedTimeToUtc(..., EASTERN_TIME_ZONE)`.
 *
 * DST note: ambiguous/non-existent local times near DST transitions resolve
 * according to `zonedTimeToUtc` offset calculations.
 */
export function easternWallClockToUtcDate(date: Date): Date {
  return zonedTimeToUtc(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    EASTERN_TIME_ZONE,
  );
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, seconds);
  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let utcTime = utcGuess - firstOffset;

  const secondOffset = getTimeZoneOffsetMs(new Date(utcTime), timeZone);
  if (secondOffset !== firstOffset) {
    utcTime = utcGuess - secondOffset;
  }

  return new Date(utcTime);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const hours = Number(parts.find((part) => part.type === "hour")?.value);
  const minutes = Number(parts.find((part) => part.type === "minute")?.value);
  const seconds = Number(parts.find((part) => part.type === "second")?.value);

  const asUtc = Date.UTC(year, month - 1, day, hours, minutes, seconds);
  return asUtc - date.getTime();
}
