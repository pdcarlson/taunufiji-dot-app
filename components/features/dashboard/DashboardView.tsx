"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getDashboardStatsAction } from "@/lib/presentation/actions/dashboard.actions";
import { getMyTasksAction } from "@/lib/presentation/actions/housing/tasks.actions";
import GreetingCard from "./GreetingCard";
import LeaderboardWidget from "@/components/features/leaderboard/widgets/LeaderboardWidget";
import { MyDutiesWidget } from "@/components/features/housing/MyDutiesWidget";
import PointsLedger from "./PointsLedger";
import AdHocRequestCard from "@/components/features/housing/AdHocRequestCard";
import {
  TaskSyncProvider,
  applyTaskChange,
} from "@/components/features/housing/TaskSyncContext";
import { HousingTask } from "@/lib/domain/types/task";
import { DashboardStats } from "@/lib/domain/entities/dashboard.dto";
import { LeaderboardEntry } from "@/lib/presentation/queries/dashboard.queries";
import { Loader2 } from "lucide-react";

interface DashboardViewProps {
  initialLeaderboard: LeaderboardEntry[];
  initialLeaderboardPrefetched: boolean;
}

export default function DashboardView({
  initialLeaderboard,
  initialLeaderboardPrefetched,
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

  const reloadMyTasks = useCallback(async () => {
    try {
      const token = await getToken();
      const tasksData = await getMyTasksAction(token);
      setMyTasks((tasksData.documents || []) as HousingTask[]);
    } catch (e) {
      console.error("My tasks refresh failed", e);
    }
  }, [getToken]);

  // Cards report mutations here; router.refresh() never reached this client state.
  const handleTaskChanged = useCallback(
    (taskId: string, updated: HousingTask | null) => {
      setMyTasks((prev) =>
        applyTaskChange(prev, taskId, updated, (t) => !!t.assigned_to),
      );
      void reloadMyTasks();
    },
    [reloadMyTasks],
  );

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
      </div>
    );
  }

  return (
    <TaskSyncProvider onTaskChanged={handleTaskChanged}>
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
                onSuccess={() => void reloadMyTasks()}
              />
            </div>
          </div>

          {/* RIGHT COLUMN (Rankings) */}
          <div className="flex flex-col">
            <LeaderboardWidget
              initialLeaderboard={initialLeaderboard}
              initialLeaderboardPrefetched={initialLeaderboardPrefetched}
            />
          </div>
        </div>

        {/* 4. Points Ledger (Full Width) */}
        <div className="w-full">
          <PointsLedger history={stats?.ledgerHistory || []} />
        </div>
      </div>
    </TaskSyncProvider>
  );
}
