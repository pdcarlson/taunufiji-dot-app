import {
  createResponse,
  createEphemeralResponse,
  getOptionValue,
} from "../utils";
import { TasksService } from "@/lib/services/tasks.service";
import { CommandHandler } from "../types";

export const duties: CommandHandler = async (interaction) => {
  const discordId = interaction.member?.user.id;
  if (!discordId) return createEphemeralResponse("User not identified.");

  try {
    // TasksService expects the ID stored in `assigned_to`, which is Discord ID.
    const tasks = await TasksService.getMyTasks(discordId);

    if (tasks.total === 0) {
      return createResponse({ content: "✅ You have no pending duties." });
    }

    const fields = tasks.documents.map((t) => ({
      name: `${t.title} (${t.points_value} pts)`,
      value: `Due: ${t.due_at ? new Date(t.due_at).toLocaleDateString() : "No Deadline"}\nStatus: ${t.status}\nID: \`${t.$id}\``,
    }));

    return createResponse({
      embeds: [
        {
          title: "📋 Your Duties",
          fields: fields.slice(0, 25), // Discord Limit
          color: 0x3498db,
        },
      ],
    });
  } catch (e) {
    console.error("Duties Error", e);
    return createEphemeralResponse("Failed to fetch duties.");
  }
};

export const bounties: CommandHandler = async () => {
  try {
    const tasks = await TasksService.getOpenTasks();
    const bountyList = tasks.documents.filter((t) => t.type === "bounty");

    if (bountyList.length === 0) {
      return createResponse({ content: "😔 No bounties available right now." });
    }

    const fields = bountyList.map((t) => ({
      name: `${t.title} (${t.points_value} pts)`,
      value: `ID: \`${t.$id}\``,
    }));

    return createResponse({
      embeds: [
        {
          title: "💰 Available Bounties",
          fields: fields.slice(0, 25),
          color: 0xf1c40f,
        },
      ],
    });
  } catch (e) {
    console.error("Bounties Error", e);
    return createEphemeralResponse("Failed to fetch bounties.");
  }
};

export const claim: CommandHandler = async (interaction, options) => {
  const taskId = options.task_id;
  const discordId = interaction.member?.user.id;
  if (!discordId) return createEphemeralResponse("User not identified.");

  try {
    // Check if task exists and is open (Service handles this? No, service updates blindly mostly, but unclaimTask sets to open. claimTask sets updates.)
    // We should probably check if it's open first or let Service handle logic?
    // TasksService.claimTask updates status to pending.
    await TasksService.claimTask(taskId, discordId);

    return createResponse({
      content: `✅ Successfully claimed task \`${taskId}\`. Good luck!`,
    });
  } catch (e: any) {
    console.error("Claim Error", e);
    const msg =
      e.message || "Failed to claim task. Check ID or if it's already claimed.";
    return createEphemeralResponse(`❌ ${msg}`);
  }
};

export const submit: CommandHandler = async (interaction, options) => {
  const taskId = options.task_id;
  const attachment = options.proof; // Discord attachment object

  // Attachment comes as an object ID in 'options' if resolved?
  // Wait, API sends "resolved" data.
  // In `options`, the value is the ID of the attachment.
  // The actual Attachment object is in `interaction.data.resolved.attachments[id]`.
  // We need to handle this resolution in `registry.ts` or helper.
  // OR we just assume `options` passed to handler contains the resolved value if we parse it right.
  // My `getOptionValue` just gets valid.
  // Let's assume for now we look at `interaction.data?.resolved?.attachments` if type is 11.

  let proofUrl = "";

  if ((interaction.data as any)?.resolved?.attachments && attachment) {
    const att = (interaction.data as any).resolved.attachments[attachment];
    if (att) proofUrl = att.url;
  }

  if (!proofUrl)
    return createEphemeralResponse("Proof attachment is missing or invalid.");

  const discordId = interaction.member?.user.id;
  if (!discordId) return createEphemeralResponse("User not identified.");

  try {
    await TasksService.submitProof(taskId, discordId, proofUrl);

    return createResponse({
      content: `✅ Proof submitted for task \`${taskId}\`. Review pending.`,
    });
  } catch (e: any) {
    console.error("Submit Error", e);
    const msg = e.message || "Failed to submit proof.";
    return createEphemeralResponse(`❌ ${msg}`);
  }
};
