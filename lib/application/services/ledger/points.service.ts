import { logger } from "@/lib/utils/logger";
import { IUserRepository } from "@/lib/domain/ports/user.repository";
import { ILedgerRepository } from "@/lib/domain/ports/ledger.repository";
import { LEDGER_CONSTANTS } from "@/lib/constants";

import {
  IPointsService,
  PointsTransaction,
} from "@/lib/domain/ports/services/points.service.port";

export class PointsService implements IPointsService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly ledgerRepository: ILedgerRepository,
  ) {}

  /**
   * Awards (or deducts) points for a user.
   * 1. Updates User Profile (current + lifetime).
   * 2. Creates a Ledger Record.
   */
  async awardPoints(discordUserId: string, tx: PointsTransaction) {
    try {
      // 1. Resolve User via Repository
      const user = await this.userRepository.findByDiscordId(discordUserId);
      if (!user) {
        throw new Error(`User not found with Discord ID: ${discordUserId}`);
      }

      // 2. Update User Points via Repository
      await this.userRepository.updatePoints(user.id, tx.amount);

      // 3. Create Ledger Record
      const isDebit = tx.amount < 0;
      await this.ledgerRepository.create({
        user_id: discordUserId,
        amount: Math.abs(tx.amount),
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
  }

  /**
   * Get transaction history for a user
   */
  async getHistory(userId: string, category?: string | string[]) {
    // Sanitize category
    let validCategory: "task" | "fine" | "event" | "manual" | undefined;
    if (typeof category === "string") {
      if (["task", "fine", "event", "manual"].includes(category)) {
        validCategory = category as "task" | "fine" | "event" | "manual";
      }
    }

    return await this.ledgerRepository.findMany({
      userId,
      category: validCategory,
      limit: LEDGER_CONSTANTS.HISTORY_LIMIT,
      orderBy: "timestamp",
      orderDirection: "desc",
    });
  }

  async getUserRank(
    userId: string,
  ): Promise<{ rank: number; points: number } | null> {
    const user = await this.userRepository.findByDiscordId(userId);
    if (!user) return null;

    const points = user.details_points_current || 0;

    // Count users with strictly more points
    // We add 1 to get the rank (e.g. 0 better -> Rank 1)
    const betterCount =
      await this.userRepository.countWithPointsGreaterThan(points);

    return {
      rank: betterCount + 1,
      points,
    };
  }

  async getLeaderboard(limit: number = LEDGER_CONSTANTS.DEFAULT_LEADERBOARD_LIMIT) {
    // Direct DB Call
    const members = await this.userRepository.findTopByPoints(limit);
    return members.map((m, i) => ({
      id: m.id,
      discord_id: m.discord_id,
      name: m.full_name || m.discord_handle || "Unknown",
      points: m.details_points_current || 0,
      rank: i + 1,
    }));
  }
}
