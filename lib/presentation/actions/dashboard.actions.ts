"use server";

import { createJWTClient } from "@/lib/presentation/server/appwrite";
import { getContainer } from "@/lib/infrastructure/container";
import { logger } from "@/lib/utils/logger";
import { DashboardStats } from "@/lib/domain/entities/dashboard.dto";

export async function getDashboardStatsAction(
  jwt: string,
): Promise<DashboardStats> {
  try {
    const {
      dutyService,
      authService,
      maintenanceService,
      pointsService,
      ledgerRepository,
    } = getContainer();

    // 1. Verify Identity
    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const userId = user.$id;

    // 2. Authorization Guard
    const isAuthorized = await authService.verifyBrother(userId);
    if (!isAuthorized) {
      return emptyStats();
    }

    // 3. Resolve Profile (Discord ID)
    const profile = await authService.getProfile(userId);
    if (!profile) {
      return emptyStats();
    }

    // 4. Maintenance & Active Tasks
    let activeCount = 0;
    try {
      await maintenanceService.performMaintenance(profile.discord_id);
      const myTasksRes = await dutyService.getMyTasks(profile.discord_id);
      if (myTasksRes && Array.isArray(myTasksRes.documents)) {
        activeCount = myTasksRes.documents.filter(
          (d) =>
            d.status === "pending" ||
            d.status === "open" ||
            d.status === "rejected",
        ).length;
      }
    } catch (e) {
      logger.error("Maintenance or Task Fetch Failed", e);
    }

    // 5. Points & Full Name
    const points = profile.details_points_current || 0;
    const fullName = profile.full_name || "Brother";

    // 6. History
    let housingHistory: any[] = [];
    let libraryHistory: any[] = [];

    try {
      const [housingEntries, libraryEntries] = await Promise.all([
        pointsService.getHistory(profile.discord_id, ["task", "fine"]),
        ledgerRepository.findMany({
          userId: profile.discord_id,
          category: "event",
          limit: 3,
          orderBy: "timestamp",
          orderDirection: "desc",
        }),
      ]);

      housingHistory = housingEntries.slice(0, 3).map((d) => ({
        id: d.id,
        reason: d.reason,
        amount: d.amount,
        category: d.category,
        timestamp: d.timestamp,
      }));

      libraryHistory = libraryEntries.map((d) => ({
        id: d.id,
        reason: d.reason,
        amount: d.amount,
        category: d.category,
        timestamp: d.timestamp,
      }));
    } catch (err) {
      console.warn("Failed to fetch distributed history", err);
    }

    return {
      points,
      activeTasks: activeCount,
      pendingReviews: 0,
      fullName,
      housingHistory,
      libraryHistory,
    };
  } catch (e: unknown) {
    logger.error("getDashboardStatsAction Failed", e);
    return emptyStats();
  }
}

function emptyStats() {
  return {
    points: 0,
    activeTasks: 0,
    pendingReviews: 0,
    fullName: "Brother",
    housingHistory: [],
    libraryHistory: [],
  };
}

export async function getLeaderboardAction(jwt: string) {
  try {
    const { pointsService, authService } = getContainer();

    // Verify Identity
    const { account } = createJWTClient(jwt);
    const user = await account.get();

    // Verify Role
    const isAuthorized = await authService.verifyBrother(user.$id);
    if (!isAuthorized) {
      return [];
    }

    const leaderboard = await pointsService.getLeaderboard(5);

    // Map to View Model
    return leaderboard.map((entry, i) => ({
      id: entry.id,
      name: entry.name,
      points: entry.points,
      rank: i + 1,
    }));
  } catch (e) {
    logger.error("Leaderboard fetch failed", e);
    return [];
  }
}

export async function getMyRankAction(jwt: string) {
  try {
    const { userRepository, authService, pointsService } = getContainer();

    // 1. Resolve User
    const { account } = createJWTClient(jwt);
    const authUser = await account.get();
    const userId = authUser.$id;

    let user = await userRepository.findByAuthId(userId);
    if (!user) {
      // Fallback logic if needed, but usually findByAuthId is enough
      return null;
    }

    // 2. Authorization
    const isAuthorized = await authService.verifyBrother(userId);
    if (!isAuthorized) {
      return null;
    }

    // 3. Get Rank via Service
    const rankData = await pointsService.getUserRank(user.discord_id); // Rank uses Discord ID

    if (!rankData) return null;

    return {
      rank: rankData.rank,
      points: rankData.points,
    };
  } catch (e) {
    logger.error("My Rank fetch failed", e);
    return null;
  }
}
