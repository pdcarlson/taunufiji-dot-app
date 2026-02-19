"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getDashboardStatsAction } from "@/lib/presentation/actions/dashboard.actions";
import { getMyTasksAction } from "@/lib/presentation/actions/housing/tasks.actions";
import GreetingCard from "./GreetingCard";
import LeaderboardWidget from "@/components/features/leaderboard/widgets/LeaderboardWidget";
import MyDutiesWidget from "@/components/features/housing/MyDutiesWidget";
import PointsLedger from "./PointsLedger";
import AdHocRequestCard from "@/components/features/housing/AdHocRequestCard";
import { HousingTask } from "@/lib/domain/types/task";
import { DashboardStats } from "@/lib/domain/entities/dashboard.dto";
import { Loader2 } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  userId: string;
  name: string;
  points: number;
}

interface DashboardViewProps {
  initialLeaderboard: LeaderboardEntry[];
}

export default function DashboardView({
  initialLeaderboard,
}: DashboardViewProps) {
  const { getToken, user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
  }, [user, getToken]);

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* LEFT COLUMN (Wide) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div>
            <MyDutiesWidget
              initialTasks={myTasks}
              userId={user?.$id || ""}
              profileId={profile?.discord_id || user?.$id || ""}
              variant="wide"
            />
          </div>
          <div className="flex-1">
            <AdHocRequestCard
              variant="horizontal"
              onSuccess={() => window.location.reload()}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (Rankings) */}
        <div className="flex flex-col">
          <LeaderboardWidget initialLeaderboard={initialLeaderboard} />
        </div>
      </div>

      {/* 4. Points Ledger (Full Width) */}
      <div className="w-full">
        <PointsLedger history={stats?.ledgerHistory || []} />
      </div>
    </div>
  );
}
