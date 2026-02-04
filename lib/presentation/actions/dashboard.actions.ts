"use server";

import { actionWrapper } from "@/lib/presentation/utils/action-handler";
import { DashboardStats } from "@/lib/domain/entities/dashboard.dto";

export async function getDashboardStatsAction(
  jwt: string,
): Promise<DashboardStats> {
  const result = await actionWrapper(
    async ({ container, userId }) => {
      // 3. Resolve Profile (Discord ID)
      const profile = await container.authService.getProfile(userId);
      if (!profile) {
        throw new Error("Profile not found");
      }

      // 4. Maintenance & Active Tasks
      let activeCount = 0;
      try {
        await container.maintenanceService.performMaintenance(
          profile.discord_id,
        );
        const myTasksRes = await container.dutyService.getMyTasks(
          profile.discord_id,
        );
        if (myTasksRes && Array.isArray(myTasksRes.documents)) {
          activeCount = myTasksRes.documents.filter(
            (d) =>
              d.status === "pending" ||
              d.status === "open" ||
              d.status === "rejected",
          ).length;
        }
      } catch (e) {
        console.warn("Maintenance or Task Fetch Failed", e);
      }

      // 5. Points & Full Name
      const points = profile.details_points_current || 0;
      const fullName = profile.full_name || "Brother";

      // 6. History
      let housingHistory: any[] = [];
      let libraryHistory: any[] = [];
      let ledgerHistory: any[] = [];

      try {
        const [housingEntries, libraryEntries, allLedgerEntries] =
          await Promise.all([
            container.pointsService.getHistory(profile.discord_id, [
              "task",
              "fine",
            ]),
            container.ledgerRepository.findMany({
              userId: profile.discord_id,
              category: "event",
              limit: 3,
              orderBy: "timestamp",
              orderDirection: "desc",
            }),
            // Global Ledger Fetch (Last 20 items for everyone)
            container.ledgerRepository.findMany({
              limit: 20,
              orderBy: "timestamp",
              orderDirection: "desc",
            }),
          ]);

        housingHistory = housingEntries.slice(0, 3).map((d) => ({
          id: d.id,
          reason: d.reason,
          amount: d.is_debit ? -d.amount : d.amount,
          category: d.category,
          timestamp: d.timestamp,
        }));

        libraryHistory = libraryEntries.map((d) => ({
          id: d.id,
          reason: d.reason,
          amount: d.is_debit ? -d.amount : d.amount,
          category: d.category,
          timestamp: d.timestamp,
        }));

        // RESOLVE NAMES FOR GLOBAL LEDGER
        const uniqueUserIds = Array.from(
          new Set(allLedgerEntries.map((d) => d.user_id)),
        );
        const users =
          await container.userRepository.findManyByDiscordIds(uniqueUserIds);
        const userMap = new Map(users.map((u) => [u.discord_id, u]));

        ledgerHistory = allLedgerEntries.map((d) => {
          const user = userMap.get(d.user_id);
          const realAmount = d.is_debit ? -d.amount : d.amount;
          return {
            id: d.id,
            reason: d.reason,
            amount: realAmount,
            category: d.category,
            timestamp: d.timestamp,
            userId: d.user_id,
            userName: user?.full_name || user?.discord_handle || "Unknown",
          };
        });
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
        ledgerHistory,
      };
    },
    { jwt },
  );

  if (result.success && result.data) return result.data;
  return emptyStats();
}

function emptyStats() {
  return {
    points: 0,
    activeTasks: 0,
    pendingReviews: 0,
    fullName: "Brother",
    housingHistory: [],
    libraryHistory: [],
    ledgerHistory: [],
  };
}

export async function getLeaderboardAction(jwt: string) {
  const result = await actionWrapper(
    async ({ container }) => {
      const leaderboard = await container.pointsService.getLeaderboard(5);

      // Map to View Model
      return leaderboard.map((entry, i) => ({
        id: entry.id,
        name: entry.name,
        points: entry.points,
        rank: i + 1,
      }));
    },
    { jwt },
  );

  if (result.success && result.data) return result.data;
  return [];
}

export async function getMyRankAction(jwt: string) {
  const result = await actionWrapper(
    async ({ container, userId }) => {
      const user = await container.userRepository.findByAuthId(userId);
      if (!user) {
        return null; // Fallback logic if needed
      }

      // 3. Get Rank via Service
      const rankData = await container.pointsService.getUserRank(
        user.discord_id,
      );

      if (!rankData) return null;

      return {
        rank: rankData.rank,
        points: rankData.points,
      };
    },
    { jwt },
  );

  if (result.success && result.data) return result.data;
  return null;
}
