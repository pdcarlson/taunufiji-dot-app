"use server";

import { createSessionClient } from "@/lib/presentation/server/appwrite";
import { getContainer } from "@/lib/infrastructure/container";
import { logger } from "@/lib/utils/logger";
import { DashboardStats } from "@/lib/domain/entities/dashboard.dto";

export async function getDashboardStatsAction(
  userId: string,
): Promise<DashboardStats> {
  try {
    const {
      dutyService,
      authService,
      maintenanceService,
      pointsService,
      ledgerRepository,
    } = getContainer();

    // 1. Authorization Guard
    const isAuthorized = await authService.verifyBrother(userId);
    if (!isAuthorized) {
      return {
        points: 0,
        activeTasks: 0,
        pendingReviews: 0,
        fullName: "Brother",
        housingHistory: [],
        libraryHistory: [],
      };
    }

    // 2. Resolve Profile (Discord ID)
    const profile = await authService.getProfile(userId);
    if (!profile) {
      // If no profile, we can't do much
      return {
        points: 0,
        activeTasks: 0,
        pendingReviews: 0,
        fullName: "Brother",
        housingHistory: [],
        libraryHistory: [],
      };
    }

    // 3. Maintenance & Active Tasks
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

    // 4. Pending Reviews (Placeholder)
    const pendingReviewsCount = 0;

    // 5. Points & Full Name (from User Entity)
    // We already invoked getProfile (which calls userRepository.findByAuthId or similar)
    // But getProfile returns User entity.
    // So 'profile' IS the strict Domain User.
    const points = profile.details_points_current || 0;
    const fullName = profile.full_name || "Brother";

    // 6. History
    let housingHistory: any[] = [];
    let libraryHistory: any[] = [];

    try {
      // Parallel fetch using Service/Repo
      // Housing: categories 'task', 'fine'
      // Library: category 'event'
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
      pendingReviews: pendingReviewsCount,
      fullName,
      housingHistory,
      libraryHistory,
    };
  } catch (e: unknown) {
    logger.error("getDashboardStatsAction Failed", e);
    return {
      points: 0,
      activeTasks: 0,
      pendingReviews: 0,
      fullName: "Brother",
      housingHistory: [],
      libraryHistory: [],
    };
  }
}

export async function getLeaderboardAction(userId?: string) {
  try {
    const { pointsService, authService } = getContainer();

    // If we have a userId, verify role
    if (userId) {
      const isAuthorized = await authService.verifyBrother(userId);
      if (!isAuthorized) {
        return [];
      }
    } else {
      // Fallback: Try Session Client
      try {
        const { account } = await createSessionClient();
        const user = await account.get();
        if (!(await authService.verifyBrother(user.$id))) {
          // user.$id is safe here, strictly typed from Appwrite Node SDK Account
          return [];
        }
      } catch (_sessionError) {
        return [];
      }
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

export async function getMyRankAction(userId: string) {
  try {
    // 1. Resolve User (Doc ID or Discord ID)
    const { userRepository, authService, pointsService } = getContainer();

    let user = await userRepository.findById(userId);
    if (!user) {
      user = await userRepository.findByDiscordId(userId);
    }

    if (!user) {
      console.warn(`[getMyRank] User not found for ID: ${userId}`);
      return null;
    }

    // 2. Authorization
    const isAuthorized = await authService.verifyBrother(user.auth_id);
    if (!isAuthorized) {
      return null;
    }

    // 3. Get Rank via Service
    const rankData = await pointsService.getUserRank(user.discord_id);

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
