import { createResponse, createEphemeralResponse } from "../utils";
import { Query } from "node-appwrite";
import { getDatabase } from "@/lib/infrastructure/persistence";
import { DB_ID, COLLECTIONS } from "@/lib/infrastructure/config/schema";
import { CommandHandler } from "../types";

// helper for Appwrite (read-only for profile lookup)
const db = getDatabase();

export const leaderboard: CommandHandler = async () => {
  try {
    console.log("🏆 Leaderboard command triggered");
    console.log("DB_ID:", DB_ID);
    console.log("COLLECTION:", COLLECTIONS.USERS);

    const list = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.orderDesc("details_points_current"),
      Query.limit(10),
    ]);

    console.log(`✅ Query successful. Found ${list.total} users`);

    if (list.total === 0) {
      console.log("⚠️ No users in database");
      return createResponse({ content: "No users found." });
    }

    const lines = list.documents.map((u, i) => {
      const medal =
        i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      return `${medal} **${u.full_name}** — ${u.details_points_current || 0} pts`;
    });

    console.log("✅ Formatted leaderboard:", lines);

    return createResponse({
      embeds: [
        {
          title: "🏆 Leaderboard",
          description: lines.join("\n"),
          color: 0xffd700,
        },
      ],
    });
  } catch (error: unknown) {
    const errorDetails =
      typeof error === "object" && error !== null
        ? (error as {
            message?: string;
            code?: number;
            type?: string;
            stack?: string;
          })
        : undefined;
    console.error("❌ Leaderboard Error Details:", {
      message: errorDetails?.message || String(error),
      code: errorDetails?.code,
      type: errorDetails?.type,
      stack: errorDetails?.stack,
    });
    return createEphemeralResponse(
      `Failed to fetch leaderboard: ${errorDetails?.message || "Unknown error"}`,
    );
  }
};
