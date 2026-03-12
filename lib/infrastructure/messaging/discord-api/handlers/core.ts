import { createResponse, createEphemeralResponse } from "../utils";
import { Query } from "node-appwrite";
import { getDatabase } from "@/lib/infrastructure/persistence";
import { DB_ID, COLLECTIONS } from "@/lib/infrastructure/config/schema";
import { CommandHandler } from "../types";
import { logger } from "@/lib/utils/logger";

// helper for Appwrite (read-only for profile lookup)
const db = getDatabase();

export const leaderboard: CommandHandler = async () => {
  try {
    logger.debug("🏆 Leaderboard command triggered");
    logger.debug("Leaderboard DB context", {
      dbId: DB_ID,
      collection: COLLECTIONS.USERS,
    });

    const list = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.orderDesc("details_points_current"),
      Query.limit(10),
    ]);

    logger.debug("Leaderboard query successful", { totalUsers: list.total });

    if (list.total === 0) {
      logger.warn("Leaderboard query returned no users");
      return createResponse({ content: "No users found." });
    }

    const lines = list.documents.map((u, i) => {
      const medal =
        i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      return `${medal} **${u.full_name}** — ${u.details_points_current || 0} pts`;
    });

    logger.debug("Formatted leaderboard payload", { lines });

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
    const errorDetails: {
      message: string;
      stack?: string;
      code?: number | string;
      type?: string;
    } = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error) };

    if (typeof error === "object" && error !== null) {
      const metadata = error as { code?: number | string; type?: string };
      errorDetails.code = metadata.code;
      errorDetails.type = metadata.type;
    }

    logger.error("Leaderboard command failed", {
      message: errorDetails.message,
      code: errorDetails.code,
      type: errorDetails.type,
      stack: errorDetails.stack,
    });
    return createEphemeralResponse(
      "Unable to load leaderboard right now. Please try again later.",
    );
  }
};
