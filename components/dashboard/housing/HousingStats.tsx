"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getDashboardStatsAction,
  getLeaderboardAction,
  getMyRankAction,
} from "@/lib/presentation/actions/dashboard.actions";
import { Trophy, Medal } from "lucide-react";
// import { Skeleton } from "@/components/ui/Skeleton"; // Use loader if Skeleton missing
import { LeaderboardEntry } from "@/lib/domain/entities/user.entity";

export default function HousingStats() {
  const { user, profile } = useAuth();
  const [points, setPoints] = useState<number | null>(null);
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        if (!profile?.discord_id) return;

        // 1. Get my stats (Use Auth ID)
        // 2. Get my rank (Use Discord ID)

        const [stats, rankData] = await Promise.all([
          getDashboardStatsAction(user.$id), // Auth ID for Profile Lookup
          getMyRankAction(profile.discord_id), // DB ID for Rank
        ]);

        setPoints(stats.points);
        setRank(rankData?.rank || null);
      } catch (err) {
        console.error("Failed to load stats", err);
      }
    };

    fetchData();
  }, [user, profile]);

  if (points === null) {
    return (
      <div className="bg-stone-800 text-white p-3 md:p-4 rounded-xl shadow-lg border border-stone-700 flex items-center justify-between animate-pulse">
        {/* Skeleton Left */}
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-stone-700" />
          <div className="space-y-2">
            <div className="w-16 md:w-20 h-3 bg-stone-700" />
            <div className="w-20 md:w-24 h-6 md:h-8 bg-stone-700" />
          </div>
        </div>
        {/* Skeleton Right */}
        <div className="flex flex-col items-end gap-2">
          <div className="w-16 md:w-20 h-3 bg-stone-700" />
          <div className="flex gap-2">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-stone-700" />
            <div className="w-6 h-6 md:w-8 md:h-8 bg-stone-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-800 text-white p-4 md:p-5 rounded-xl shadow-lg border border-stone-700 flex items-center justify-between">
      {/* Left: Points */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="bg-fiji-gold/20 p-2 md:p-3 rounded-full text-fiji-gold transition-colors">
          <Trophy className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <p className="text-[10px] md:text-xs text-stone-400 uppercase tracking-wider font-bold">
            Your Score
          </p>
          <p className="text-2xl md:text-3xl font-bebas tracking-wide text-white leading-none">
            {points} PTS
          </p>
        </div>
      </div>

      {/* Right: Rank */}
      <div className="flex items-center gap-4 text-right">
        <div>
          <p className="text-[10px] md:text-xs text-stone-400 uppercase tracking-wider font-bold">
            Current Rank
          </p>
          <div className="flex items-center justify-end gap-1">
            <span className="text-2xl md:text-3xl font-bebas tracking-wide text-white leading-none">
              #{rank || "-"}
            </span>
            {rank === 1 && (
              <Medal className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
