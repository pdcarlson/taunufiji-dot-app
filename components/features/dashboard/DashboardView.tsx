"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getDashboardStatsAction } from "@/lib/presentation/actions/dashboard.actions";
import { getMyTasksAction } from "@/lib/presentation/actions/housing/tasks.actions";
import GreetingCard from "./GreetingCard";
import LibraryWidget from "@/components/features/library/widgets/LibraryWidget";
import LeaderboardWidget from "@/components/features/leaderboard/widgets/LeaderboardWidget";
import MyDutiesWidget from "@/components/features/housing/MyDutiesWidget";
import PointsLedger from "./PointsLedger";
import { HousingTask } from "@/lib/domain/types/task";
import { Loader2 } from "lucide-react";

interface DashboardViewProps {
  initialLeaderboard: any[];
}

export default function DashboardView({
  initialLeaderboard,
}: DashboardViewProps) {
  const { getToken, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<HousingTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return;
        const token = await getToken();

        const [statsData, tasksData] = await Promise.all([
          getDashboardStatsAction(token),
          getMyTasksAction(token),
        ]);

        setStats(statsData);
        setMyTasks((tasksData.documents || []) as HousingTask[]);
      } catch (e) {
        console.error("Dashboard fetch failed", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 delay-100">
      {/* GREETING CARD (Full Width) */}
      <GreetingCard userName={user?.name} />

      {/* WIDGET GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. My Duties (replaces Housing Stats) */}
        <MyDutiesWidget initialTasks={myTasks} userId={user?.$id || ""} />
        {/* 2. Library */}
        <LibraryWidget stats={stats || {}} />
        {/* 3. Leaderboard */}
        <LeaderboardWidget initialLeaderboard={initialLeaderboard} />
      </div>

      {/* 4. Points Ledger (Full Width) */}
      <div className="w-full">
        <PointsLedger history={stats?.ledgerHistory || []} />
      </div>
    </div>
  );
}
