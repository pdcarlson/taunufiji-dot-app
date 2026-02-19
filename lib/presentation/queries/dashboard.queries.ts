import "server-only";

import { PointsService } from "@/lib/application/services/ledger/points.service";
import { AppwriteUserRepository } from "@/lib/infrastructure/persistence/user.repository";
import { AppwriteLedgerRepository } from "@/lib/infrastructure/persistence/ledger.repository";

// REPOSITORIES (Uses getAdminClient() internally)
const userRepo = new AppwriteUserRepository();
const ledgerRepo = new AppwriteLedgerRepository();

// SERVICE
const pointsService = new PointsService(userRepo, ledgerRepo);

export interface LeaderboardEntry {
  id: string;
  userId: string;
  name: string;
  points: number;
}

/**
 * Fetch Leaderboard (Server Side)
 * Returns plain JSON objects
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const leaderboard = await pointsService.getLeaderboard(5);

    // Map to View Model & Serialize
    return leaderboard.map((entry) => ({
      id: entry.id,
      userId: entry.id, // entry.id is the discord userId in this context
      name: entry.name,
      points: entry.points,
    }));
  } catch (error) {
    console.error("Failed to prefetch leaderboard:", error);
    return [];
  }
}
