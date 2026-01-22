import { createResponse, createEphemeralResponse } from "../utils";
import { TasksService } from "@/lib/services/tasks.service";
import { CommandHandler } from "../types";

/**
 * /duty - Assign a one-off duty (mirrors CreateOneOffModal)
 * Fields: user, title, due_date, description
 * Logic: points_value = 0, type = "one_off"
 */
export const duty: CommandHandler = async (interaction, options) => {
  const userId = options.user;
  const title = options.title;
  const dueDateInput = options.due_date;
  const description = options.description || "Assigned via Discord";

  // Parse due_date (Expects YYYY-MM-DD)
  let dueAt: Date;
  try {
    // Append T12:00:00 to force Noon
    const isoString = `${dueDateInput}T12:00:00`;
    dueAt = new Date(isoString);
    if (isNaN(dueAt.getTime())) throw new Error("Invalid date format");
  } catch {
    return createEphemeralResponse(
      `❌ Invalid due date format: "${dueDateInput}". Use YYYY-MM-DD (e.g. 2026-01-30).`,
    );
  }

  try {
    await TasksService.createTask({
      title,
      description,
      points_value: 0, // Duties = 0 pts, Fined if missed
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
 * Fields: title, day, description, user (optional), lead_time
 * Logic: Builds RRULE (Noon), calls createSchedule
 */
export const schedule: CommandHandler = async (interaction, options) => {
  const title = options.title;
  const day = options.day; // "MO", "TU", etc.
  const description = options.description || "Created via Discord";
  const userId = options.user || undefined;
  const leadTime = options.lead_time || 24;

  // Build RRULE (Always Noon)
  const rrule = `FREQ=WEEKLY;BYDAY=${day};BYHOUR=12;BYMINUTE=0`;

  try {
    await TasksService.createSchedule({
      title,
      description,
      recurrence_rule: rrule,
      lead_time_hours: leadTime,
      points_value: 0, // Duties = 0 pts
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
 * Fields: title, points, description
 * Logic: points_value = user input, type = "bounty", no assignee
 */
export const bounty: CommandHandler = async (interaction, options) => {
  const title = options.title;
  const points = options.points;
  const description = options.description || "No description provided.";

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
