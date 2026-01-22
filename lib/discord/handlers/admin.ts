import { createResponse, createEphemeralResponse } from "../utils";
import { TasksService } from "@/lib/services/tasks.service";
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

    // Match the working EditTaskModal pattern exactly
    const dateString = `${currentYear}-${month}-${day}T12:00:00`;
    dueAt = new Date(dateString);

    // validate date is real
    if (isNaN(dueAt.getTime())) {
      return createEphemeralResponse(
        `❌ Invalid date: "${dueDateInput}". Check month/day values.`,
      );
    }

    // if date is in the past, assume next year
    const now = new Date();
    if (dueAt < now) {
      const nextYearString = `${currentYear + 1}-${month}-${day}T12:00:00`;
      dueAt = new Date(nextYearString);
    }
  } catch {
    return createEphemeralResponse(
      `❌ Failed to parse date: "${dueDateInput}". Use MM-DD format.`,
    );
  }

  try {
    await TasksService.createTask({
      title,
      description,
      points_value: 0, // duties = 0 pts, fined if missed
      type: "one_off",
      assigned_to: userId,
      due_at: dueAt.toISOString(),
      status: "open",
    });

    return createEphemeralResponse(
      `✅ Duty assigned: **${title}** to <@${userId}>.\nDue: ${dueAt.toLocaleDateString()} (Noon)`,
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

  // build RRULE (always Noon)
  const rrule = `FREQ=WEEKLY;BYDAY=${day};BYHOUR=12;BYMINUTE=0`;

  try {
    await TasksService.createSchedule({
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
      `✅ Schedule created: **${title}**\nEvery ${dayName} at 12:00 PM. Lead time: ${leadTime}h.`,
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
    await TasksService.createTask({
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
