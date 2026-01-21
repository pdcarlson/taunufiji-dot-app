import { InteractionResponseType } from "../types";
import { createResponse, createEphemeralResponse } from "../utils";
import { Client, Databases, Query } from "node-appwrite";
import { env } from "@/lib/config/env";
import { DB_ID, COLLECTIONS } from "@/lib/types/schema";
import { CommandHandler } from "../types";

// Helper for Appwrite (read-only for profile lookup)
const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY!);
const db = new Databases(client);

export const ping: CommandHandler = async () => {
  return createResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    content: "Pong! 🏓",
  });
};

export const profile: CommandHandler = async (interaction) => {
  const discordId = interaction.member?.user.id || interaction.user?.id;
  if (!discordId) return createEphemeralResponse("Could not resolve user ID.");

  try {
    const list = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.equal("discord_id", discordId),
    ]);

    if (list.total === 0) {
      return createEphemeralResponse(
        "User not found. Please log in to the web dashboard first to sync your account.",
      );
    }

    const val = list.documents[0];
    const points = val.details_points_current || 0;
    const lifetime = val.details_points_lifetime || 0;
    const status = val.status || "active";

    return createResponse({
      embeds: [
        {
          title: `👤 ${val.full_name}`,
          fields: [
            { name: "Current Points", value: `${points}`, inline: true },
            { name: "Lifetime Points", value: `${lifetime}`, inline: true },
            { name: "Status", value: status, inline: true },
          ],
          color: 0x00ff00,
        },
      ],
    });
  } catch (e) {
    console.error("Profile Error", e);
    return createEphemeralResponse("Failed to fetch profile.");
  }
};
