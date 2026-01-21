import { createResponse, createEphemeralResponse } from "../utils";
import { TasksService } from "@/lib/services/tasks.service";
import { CommandHandler } from "../types";
import { ID } from "node-appwrite";

export const assign: CommandHandler = async (interaction, options) => {
  const userId = options.user; // Discord User ID
  const title = options.title;
  const points = options.points || 0;

  try {
    await TasksService.createTask({
      title,
      description: "Assigned via Discord",
      points_value: points,
      type: "one_off",
      assigned_to: userId,
      // TasksService logic: claimTask sets to pending. create sets to status.
      // "Assigned" usually means "Pending Completion".
      status: "pending",
    });

    return createResponse({
      content: `✅ Assigned "${title}" to <@${userId}>.`,
    });
  } catch (e) {
    console.error("Assign Error", e);
    return createEphemeralResponse("Failed to assign task.");
  }
};

export const approve: CommandHandler = async (interaction, options) => {
  const taskId = options.task_id;
  try {
    await TasksService.verifyTask(taskId);
    return createResponse({
      content: `✅ Task \`${taskId}\` approved and points awarded.`,
    });
  } catch (e) {
    console.error("Approve Error", e);
    return createEphemeralResponse("Failed to approve task.");
  }
};

export const reject: CommandHandler = async (interaction, options) => {
  const taskId = options.task_id;
  const reason = options.reason;
  try {
    await TasksService.rejectTask(taskId);
    return createResponse({
      content: `🚫 Task \`${taskId}\` rejected. Reason: ${reason}`,
    });
  } catch (e) {
    console.error("Reject Error", e);
    return createEphemeralResponse("Failed to reject task.");
  }
};

export const reassign: CommandHandler = async (interaction, options) => {
  const taskId = options.task_id;
  const userId = options.user;
  try {
    await TasksService.adminReassign(taskId, userId);
    return createResponse({
      content: `🔄 Task \`${taskId}\` reassigned to <@${userId}>.`,
    });
  } catch (e) {
    console.error("Reassign Error", e);
    return createEphemeralResponse("Failed to reassign task.");
  }
};
