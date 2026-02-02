import { getContainer } from "@/lib/infrastructure/container";
import { getDashboardStatsAction } from "@/lib/presentation/actions/dashboard.actions";
import HousingWidget from "@/components/features/housing/widgets/HousingWidget";
import LibraryWidget from "@/components/features/library/widgets/LibraryWidget";
import LeaderboardWidget from "@/components/features/leaderboard/widgets/LeaderboardWidget";
import MyDutiesWidget from "@/components/features/housing/MyDutiesWidget";
import { HousingTask } from "@/lib/domain/types/task";

export default async function DashboardWidgets({
  userId,
  discordId,
}: {
  userId: string;
  discordId: string;
}) {
  const container = getContainer();

  // Use allSettled to prevent one failure from crashing the page
  const [statsRes, myTasksRes] = await Promise.allSettled([
    getDashboardStatsAction(userId),
    container.dutyService.getMyTasks(discordId),
  ]);

  const stats =
    statsRes.status === "fulfilled"
      ? statsRes.value
      : {
          points: 0,
          activeTasks: 0,
          pendingReviews: 0,
          fullName: "Brother",
          housingHistory: [],
          libraryHistory: [],
        };

  const myTasks =
    myTasksRes.status === "fulfilled" && myTasksRes.value
      ? ((myTasksRes.value.documents || []) as HousingTask[])
      : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 delay-100">
      {/* MY DUTIES WIDGET */}
      <MyDutiesWidget initialTasks={myTasks} userId={userId} />

      {/* WIDGET GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Housing Stats */}
        <HousingWidget stats={stats} loading={false} />
        {/* 2. Library (Static) */}
        <LibraryWidget stats={stats} />
        {/* 3. Leaderboard */}
        <LeaderboardWidget />
      </div>
    </div>
  );
}
