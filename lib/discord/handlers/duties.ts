import { createResponse, createEphemeralResponse } from "../utils";
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

    const fields = tasks.documents.map((t: any) => ({
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
    const bountyList = tasks.documents.filter((t: any) => t.type === "bounty");

    if (bountyList.length === 0) {
      return createResponse({ content: "😔 No bounties available right now." });
    }

    const fields = bountyList.map((t: any) => ({
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
