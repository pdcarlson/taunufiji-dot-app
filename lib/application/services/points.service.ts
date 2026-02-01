/**
 * Points Service
 *
 * Handles all point-related operations including awards, deductions,
 * and transaction history. Uses repository pattern for data access.
 */

import { logger } from "@/lib/utils/logger";
import { IUserRepository } from "@/lib/domain/ports/user.repository";
import { ILedgerRepository } from "@/lib/domain/ports/ledger.repository";

import {
  IPointsService,
  PointsTransaction,
} from "@/lib/domain/ports/services/points.service.port";

import Redis from "ioredis";

export class PointsService implements IPointsService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly ledgerRepository: ILedgerRepository,
    private readonly redis?: Redis,
  ) {}

  /**
   * Awards (or deducts) points for a user.
   * 1. Updates User Profile (current + lifetime).
   * 2. Creates a Ledger Record.
   * 3. Updates Redis Leaderboard (Write-Through).
   */
  async awardPoints(discordUserId: string, tx: PointsTransaction) {
    try {
      // 1. Resolve User via Repository
      const user = await this.userRepository.findByDiscordId(discordUserId);
      if (!user) {
        throw new Error(`User not found with Discord ID: ${discordUserId}`);
      }

      // 2. Update User Points via Repository
      // We calculate new points locally for Redis since Appwrite return is not guaranteed in repository contract
      const newPoints = (user.details_points_current || 0) + tx.amount;
      await this.userRepository.updatePoints(user.$id, tx.amount);

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

      // 4. Update Redis (Fire & Forget)
      if (this.redis) {
        try {
          const pipe = this.redis.pipeline();
          // Update Score
          pipe.zadd("leaderboard", newPoints, discordUserId);
          // Update Profile Cache
          pipe.hset(`user:${discordUserId}`, {
            name: user.full_name || user.discord_handle || "Unknown",
            avatar: user.avatar_url || "",
          });
          await pipe.exec();
        } catch (redisErr) {
          logger.error("Redis Leaderboard Update Failed", redisErr);
        }
      }

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
  async getHistory(userId: string) {
    return await this.ledgerRepository.findByUser(userId, undefined, 50);
  }

  async getLeaderboard(limit = 20) {
    // Try Redis first
    if (this.redis) {
      try {
        // Get Top IDs
        const topIds = await this.redis.zrevrange(
          "leaderboard",
          0,
          limit - 1,
          "WITHSCORES",
        );
        if (topIds.length > 0) {
          // Parse [id, score, id, score]
          const leaderboard = [];
          for (let i = 0; i < topIds.length; i += 2) {
            const id = topIds[i];
            const score = parseInt(topIds[i + 1]);
            const meta = await this.redis.hgetall(`user:${id}`);
            leaderboard.push({
              id,
              name: meta.name || "Unknown",
              points: score,
              rank: i / 2 + 1,
            });
          }
          return leaderboard;
        }
      } catch (e) {
        logger.error("Redis Leaderboard Read Failed", e);
      }
    }

    // Fallback to Appwrite
    // Fallback to Appwrite
    const members = await this.userRepository.findTopByPoints(limit);
    return members.map((m, i) => ({
      id: m.$id,
      name: m.full_name || m.discord_handle || "Unknown",
      points: m.details_points_current || 0,
      rank: i + 1,
    }));
  }
}
