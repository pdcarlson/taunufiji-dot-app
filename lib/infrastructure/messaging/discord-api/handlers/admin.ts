import { createEphemeralResponse } from "../utils";
import { getContainer } from "@/lib/infrastructure/container";
import { CommandHandler } from "../types";
import { rrulestr } from "rrule";
import { buildWeeklyEasternRecurrenceRule } from "@/lib/utils/eastern-time";

const DAY_NAME_MAP = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
} as const;

const EASTERN_TIME_ZONE = "America/New_York";

type DayKey = keyof typeof DAY_NAME_MAP;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isDayKey(value: string): value is DayKey {
  return Object.prototype.hasOwnProperty.call(DAY_NAME_MAP, value);
}

function isValidMonthDay(
  year: number,
  monthIndex: number,
  dayOfMonth: number,
): boolean {
  const date = new Date(Date.UTC(year, monthIndex, dayOfMonth));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === monthIndex &&
    date.getUTCDate() === dayOfMonth
  );
}

function formatDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

function buildEasternDueDate(
  year: number,
  month: number,
  dayOfMonth: number,
): Date {
  const dtStart = `${year}${formatDatePart(month)}${formatDatePart(dayOfMonth)}T235900`;
  const rule = rrulestr(
    `DTSTART;TZID=${EASTERN_TIME_ZONE}:${dtStart}\nRRULE:FREQ=DAILY;COUNT=1`,
  );
  const [occurrence] = rule.all();

  if (!occurrence) {
    throw new Error("Failed to resolve Eastern due date");
  }

  return occurrence;
}

function resolveDutyDueAt(monthIndex: number, dayOfMonth: number): Date {
  const now = new Date();
  const month = monthIndex + 1;
  let year = now.getFullYear();
  let dueAt = buildEasternDueDate(year, month, dayOfMonth);

  if (dueAt < now) {
    year += 1;
    dueAt = buildEasternDueDate(year, month, dayOfMonth);
  }

  return dueAt;
}

/**
 * /duty - Assign a one-off duty (mirrors CreateOneOffModal)
 * Fields: assigned_to (user), title, due_at (MM-DD), description
 * Logic: points_value = 0, type = "one_off", smart date parsing
 */
export const duty: CommandHandler = async (interaction, options) => {
  const userId = asOptionalString(options.assigned_to);
  const title = asString(options.title);
  const dueDateInput = asString(options.due_at); // MM-DD format
  const description = asString(options.description); // required field

  if (!userId || !title || !dueDateInput || !description) {
    return createEphemeralResponse(
      "❌ Missing required duty fields (assigned_to, title, due_at, description).",
    );
  }

  // Parse MM-DD and apply smart year logic
  let dueAt: Date;
  try {
    // validate format
    const datePattern = /^(\d{2})-(\d{2})$/;
    const match = dueDateInput.match(datePattern);

    if (!match) {
      return createEphemeralResponse(
        `❌ Invalid date format: "${dueDateInput}". Use MM-DD (e.g. 01-30).`,
      );
    }

    const monthIndex = Number(match[1]) - 1;
    const dayOfMonth = Number(match[2]);
    const currentYear = new Date().getFullYear();

    if (!isValidMonthDay(currentYear, monthIndex, dayOfMonth)) {
      return createEphemeralResponse(
        `❌ Invalid date: "${dueDateInput}". Check month/day values.`,
      );
    }

    dueAt = resolveDutyDueAt(monthIndex, dayOfMonth);
  } catch {
    return createEphemeralResponse(
      `❌ Failed to parse date: "${dueDateInput}". Use MM-DD format.`,
    );
  }

  try {
    const { adminService } = getContainer();
    await adminService.createTask({
      title,
      description,
      points_value: 0, // duties = 0 pts, fined if missed
      type: "one_off",
      assigned_to: userId,
      due_at: dueAt.toISOString(),
      status: "open",
    });

    return createEphemeralResponse(
      `✅ Duty assigned: **${title}** to <@${userId}>.\nDue: ${dueAt.toLocaleDateString("en-US", { timeZone: EASTERN_TIME_ZONE })} at 11:59 PM ET`,
    );
  } catch (e) {
    console.error("Duty Error", e);
    return createEphemeralResponse("❌ Failed to assign duty.");
  }
};

/**
 * /schedule - Create a recurring task (mirrors CreateScheduleModal)
 * Fields: title, day, description, assigned_to (optional), lead_time_hours
 * Logic: Builds Eastern-time RRULE at 11:59 PM, calls createSchedule
 */
export const schedule: CommandHandler = async (interaction, options) => {
  const title = asString(options.title);
  const day = asString(options.day); // "MO", "TU", etc.
  const description = asString(options.description); // required field
  const userId = asOptionalString(options.assigned_to);
  const leadTime = asNumber(options.lead_time_hours, 24);

  if (!title || !description || !isDayKey(day)) {
    return createEphemeralResponse(
      "❌ Missing or invalid schedule fields (title, day, description).",
    );
  }

  if (leadTime < 1) {
    return createEphemeralResponse("❌ Lead time must be at least 1 hour.");
  }

  const rrule = buildWeeklyEasternRecurrenceRule(day);

  try {
    const { scheduleService } = getContainer();
    await scheduleService.createSchedule({
      title,
      description,
      recurrence_rule: rrule,
      lead_time_hours: leadTime,
      points_value: 0, // duties = 0 pts
      assigned_to: userId,
      active: true,
    });

    const dayName = DAY_NAME_MAP[day];
    return createEphemeralResponse(
      `✅ Schedule created: **${title}**\nEvery ${dayName} at 11:59 PM ET. Lead time: ${leadTime}h.`,
    );
  } catch (e) {
    console.error("Schedule Error", e);
    return createEphemeralResponse("❌ Failed to create schedule.");
  }
};

/**
 * /bounty - Create a new bounty (claimable by anyone)
 * Fields: title, points_value, description
 * Logic: type = "bounty", no assignee
 */
export const bounty: CommandHandler = async (interaction, options) => {
  const title = asString(options.title);
  const points = asNumber(options.points_value);
  const description = asString(options.description); // required field

  if (!title || !description) {
    return createEphemeralResponse("❌ Title and description are required.");
  }

  if (points <= 0) {
    return createEphemeralResponse("❌ Points must be a positive number.");
  }

  try {
    const { adminService } = getContainer();
    await adminService.createTask({
      title,
      description,
      points_value: points,
      type: "bounty",
      status: "open",
    });

    return createEphemeralResponse(
      `💰 Bounty created: **${title}** (${points} pts)\n${description}`,
    );
  } catch (e) {
    console.error("Bounty Error", e);
    return createEphemeralResponse("❌ Failed to create bounty.");
  }
};
