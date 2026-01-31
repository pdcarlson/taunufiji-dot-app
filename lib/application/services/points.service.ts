/**
 * Points Service
 *
 * Handles all point-related operations including awards, deductions,
 * and transaction history. Uses repository pattern for data access.
 */

import { getContainer } from "@/lib/infrastructure/container";
import { logger } from "@/lib/utils/logger";

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
  async awardPoints(discordUserId: string, tx: PointsTransaction) {
    try {
      const { userRepository, ledgerRepository } = getContainer();

      // 1. Resolve User via Repository
      const user = await userRepository.findByDiscordId(discordUserId);
      if (!user) {
        throw new Error(`User not found with Discord ID: ${discordUserId}`);
      }

      // 2. Update User Points via Repository
      await userRepository.updatePoints(user.$id, tx.amount);

      // 3. Create Ledger Record
      // FIX: Appwrite Schema enforces Amount > 0. Store Absolute + Flag
      const isDebit = tx.amount < 0;
      await ledgerRepository.create({
        user_id: discordUserId,
        amount: Math.abs(tx.amount), // Always positive
        reason: tx.reason,
        category: tx.category,
        timestamp: new Date().toISOString(),
        is_debit: isDebit,
      });

      logger.log(
        `Points Awarded: ${discordUserId} +${tx.amount} (${tx.reason})`,
      );
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
    const { ledgerRepository } = getContainer();
    return await ledgerRepository.findByUser(userId, undefined, 50);
  },

  async getLeaderboard() {
    const { userRepository } = getContainer();
    return await userRepository.findTopByPoints(20);
  },
};
