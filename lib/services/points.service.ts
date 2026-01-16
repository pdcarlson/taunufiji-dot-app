import { Client, Databases, Query, ID } from "node-appwrite";
import { env } from "../config/env";
import { DB_ID, COLLECTIONS } from "../types/schema";
import { logger } from "../logger";

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY!);

const db = new Databases(client);

export interface PointsTransaction {
  amount: number;
  reason: string;
  category: "task" | "fine" | "event" | "manual";
}

export const PointsService = {
  /**
   * Awards (or deducts) points for a user.
   * 1. Updates User Profile (current + lifetime).
   * 2. Creates a Ledger Record.
   */
  async awardPoints(userId: string, tx: PointsTransaction) {
    try {
      // 1. Fetch User to get current totals
      // Note: In high concurrency, this could be race-condition prone.
      // Appwrite Function is safer, but for internal OS (~50 users), this is acceptable.
      let user;
      try {
        user = await db.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      } catch (e) {
        logger.error(
          `PointsService: User ${userId} not found for point award.`
        );
        throw new Error(`User ${userId} not found`);
      }

      const currentPoints = user.details_points_current || 0;
      const lifetimePoints = user.details_points_lifetime || 0;

      // 2. Calculate New Totals
      const newCurrent = currentPoints + tx.amount;
      const newLifetime =
        tx.amount > 0 ? lifetimePoints + tx.amount : lifetimePoints;

      // 3. Update User
      await db.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        details_points_current: newCurrent,
        details_points_lifetime: newLifetime,
      });

      // 4. Create Ledger Record
      await db.createDocument(DB_ID, COLLECTIONS.LEDGER, ID.unique(), {
        user_id: userId,
        amount: tx.amount,
        reason: tx.reason,
        category: tx.category,
        timestamp: new Date().toISOString(),
      });

      logger.log(`Points Awarded: ${userId} +${tx.amount} (${tx.reason})`);
      return true;
    } catch (e) {
      logger.error("PointsService Award Failed", e);
      throw e;
    }
  },

  /**
   * Get transaction history for a user
   */
  async getHistory(userId: string) {
    return await db.listDocuments(DB_ID, COLLECTIONS.LEDGER, [
      Query.equal("user_id", userId),
      Query.orderDesc("timestamp"),
      Query.limit(50),
    ]);
  },

  async getLeaderboard() {
    return await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.orderDesc("details_points_current"),
      Query.limit(20),
    ]);
  },
};
