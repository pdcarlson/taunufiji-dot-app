import "server-only";

import { QueryService } from "@/lib/application/services/task/query.service";
import { PointsService } from "@/lib/application/services/points.service";
import { AppwriteTaskRepository } from "@/lib/infrastructure/persistence/task.repository";
import { AppwriteUserRepository } from "@/lib/infrastructure/persistence/user.repository";
import { AppwriteLedgerRepository } from "@/lib/infrastructure/persistence/ledger.repository";

// REPOSITORIES (Uses getAdminClient() internally)
const userRepo = new AppwriteUserRepository();
const ledgerRepo = new AppwriteLedgerRepository();

// SERVICE
const pointsService = new PointsService(userRepo, ledgerRepo);

export interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  rank: number;
}

/**
 * Fetch Leaderboard (Server Side)
 * Returns plain JSON objects
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const leaderboard = await pointsService.getLeaderboard(5);

    // Map to View Model & Serialize
    return leaderboard.map((entry, i) => ({
      id: entry.id,
      name: entry.name,
      points: entry.points,
      rank: i + 1,
    }));
  } catch (error) {
    console.error("Failed to prefetch leaderboard:", error);
    return [];
  }
}
