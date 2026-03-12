import { createEphemeralResponse } from "../utils";
import { getContainer } from "@/lib/infrastructure/container";
import { CommandHandler } from "../types";

const DAY_SHIFT_MAP = {
  MO: "TU",
  TU: "WE",
  WE: "TH",
  TH: "FR",
  FR: "SA",
  SA: "SU",
  SU: "MO",
} as const;

type DayKey = keyof typeof DAY_SHIFT_MAP;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function isDayKey(value: string): value is DayKey {
  return Object.prototype.hasOwnProperty.call(DAY_SHIFT_MAP, value);
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

    const month = match[1];
    const day = match[2];
    const currentYear = new Date().getFullYear();

    // Create ISO string representing 11:59 PM EST
    // EST is UTC-5, so 11:59 PM EST = 04:59 AM UTC (next day)
    // This matches what the frontend browser creates when in EST timezone
    const date = new Date(`${currentYear}-${month}-${day}`);
    date.setDate(date.getDate() + 1); // Next day
    date.setUTCHours(4, 59, 0, 0); // 04:59 UTC = 11:59 PM EST
    dueAt = date;

    // validate date is real
    if (isNaN(dueAt.getTime())) {
      return createEphemeralResponse(
        `❌ Invalid date: "${dueDateInput}". Check month/day values.`,
      );
    }

    // if date is in the past, assume next year
    const now = new Date();
    if (dueAt < now) {
      const nextYearDate = new Date(`${currentYear + 1}-${month}-${day}`);
      nextYearDate.setDate(nextYearDate.getDate() + 1);
      nextYearDate.setUTCHours(4, 59, 0, 0);
      dueAt = nextYearDate;
    }
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
      `✅ Duty assigned: **${title}** to <@${userId}>.\nDue: ${dueAt.toLocaleDateString()} at 11:59 PM EST`,
    );
  } catch (e) {
    console.error("Duty Error", e);
    return createEphemeralResponse("❌ Failed to assign duty.");
  }
};

/**
 * /schedule - Create a recurring task (mirrors CreateScheduleModal)
 * Fields: title, day, description, assigned_to (optional), lead_time_hours
 * Logic: Builds RRULE (Noon), calls createSchedule
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

  // RRule runs in UTC timezone on server
  // For 11:59 PM EST: EST is UTC-5, so 11:59 PM EST = 04:59 AM UTC (next day)
  // Shift to next day of week since 04:59 crosses midnight
  const nextDay = DAY_SHIFT_MAP[day];
  const rrule = `FREQ=WEEKLY;BYDAY=${nextDay};BYHOUR=4;BYMINUTE=59`;

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

    const dayMap: Record<string, string> = {
      MO: "Monday",
      TU: "Tuesday",
      WE: "Wednesday",
      TH: "Thursday",
      FR: "Friday",
      SA: "Saturday",
      SU: "Sunday",
    };
    const dayName = dayMap[day] || day;
    return createEphemeralResponse(
      `✅ Schedule created: **${title}**\nEvery ${dayName} at 11:59 PM EST. Lead time: ${leadTime}h.`,
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
