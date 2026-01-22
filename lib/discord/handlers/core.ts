import { InteractionResponseType } from "../types";
import { createResponse, createEphemeralResponse } from "../utils";
import { Client, Databases, Query } from "node-appwrite";
import { env } from "@/lib/config/env";
import { DB_ID, COLLECTIONS } from "@/lib/types/schema";
import { CommandHandler } from "../types";

// helper for Appwrite (read-only for profile lookup)
const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY!);
const db = new Databases(client);

export const leaderboard: CommandHandler = async () => {
  try {
    const list = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.orderDesc("details_points_current"),
      Query.limit(10),
    ]);

    if (list.total === 0) {
      return createResponse({ content: "No users found." });
    }

    const lines = list.documents.map((u, i) => {
      const medal =
        i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      return `${medal} **${u.full_name}** — ${u.details_points_current || 0} pts`;
    });

    return createResponse({
      embeds: [
        {
          title: "🏆 Leaderboard",
          description: lines.join("\n"),
          color: 0xffd700,
        },
      ],
    });
  } catch (e) {
    console.error("Leaderboard Error", e);
    return createEphemeralResponse("Failed to fetch leaderboard.");
  }
};
