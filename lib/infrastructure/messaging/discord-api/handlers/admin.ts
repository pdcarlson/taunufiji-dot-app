import { createResponse, createEphemeralResponse } from "../utils";
import { AdminService, ScheduleService } from "@/lib/application/services/task";
import { CommandHandler } from "../types";

/**
 * /duty - Assign a one-off duty (mirrors CreateOneOffModal)
 * Fields: assigned_to (user), title, due_at (MM-DD), description
 * Logic: points_value = 0, type = "one_off", smart date parsing
 */
export const duty: CommandHandler = async (interaction, options) => {
  const userId = options.assigned_to;
  const title = options.title;
  const dueDateInput = options.due_at; // MM-DD format
  const description = options.description; // required field

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
    await AdminService.createTask({
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
  const title = options.title;
  const day = options.day; // "MO", "TU", etc.
  const description = options.description; // required field
  const userId = options.assigned_to || undefined;
  const leadTime = options.lead_time_hours || 24;

  // RRule runs in UTC timezone on server
  // For 11:59 PM EST: EST is UTC-5, so 11:59 PM EST = 04:59 AM UTC (next day)
  // Shift to next day of week since 04:59 crosses midnight
  const dayShiftMap: Record<string, string> = {
    MO: "TU", // Monday 11:59 PM EST = Tuesday 04:59 AM UTC
    TU: "WE",
    WE: "TH",
    TH: "FR",
    FR: "SA",
    SA: "SU",
    SU: "MO",
  };
  const nextDay = dayShiftMap[day];
  const rrule = `FREQ=WEEKLY;BYDAY=${nextDay};BYHOUR=4;BYMINUTE=59`;

  try {
    await ScheduleService.createSchedule({
      title,
      description,
      recurrence_rule: rrule,
      lead_time_hours: leadTime,
      points_value: 0, // duties = 0 pts
      assigned_to: userId,
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
  const title = options.title;
  const points = options.points_value;
  const description = options.description; // required field

  if (!points || points <= 0) {
    return createEphemeralResponse("❌ Points must be a positive number.");
  }

  try {
    await AdminService.createTask({
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
