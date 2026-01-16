"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getDashboardStatsAction,
  getLeaderboardAction,
} from "@/lib/actions/dashboard.actions";
import { Trophy, Medal } from "lucide-react";
// import { Skeleton } from "@/components/ui/Skeleton"; // Use loader if Skeleton missing
import { LeaderboardEntry } from "@/lib/types/models";

export default function HousingStats() {
  const { user, profile } = useAuth();
  const [points, setPoints] = useState<number | null>(null);
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // 1. Get my stats
        const stats = await getDashboardStatsAction(user.$id);
        setPoints(stats.points);

        // 2. Get my rank (Lazy Calculation)
        // NOTE: In a real app, fetch leaderboard from API
        const leaders: LeaderboardEntry[] = [
          { id: "1", name: "Dave", points: 2500, rank: 1 },
          { id: "2", name: "Mike", points: 2100, rank: 2 },
        ];
        if (profile) {
          // Mock Self
          const myRankIndex = leaders.findIndex(
            (m: LeaderboardEntry) => m.id === profile.discord_id
          );
          setRank(myRankIndex !== -1 ? myRankIndex + 1 : null);
        }
      } catch (err) {
        console.error("Failed to load stats", err);
      }
    };

    fetchData();
  }, [user, profile]);

  if (points === null) {
    return (
      <div className="bg-stone-800 text-white p-4 rounded-xl shadow-lg border border-stone-700 flex items-center justify-between animate-pulse">
        {/* Skeleton Left */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-stone-700" />
          <div className="space-y-2">
            <div className="w-20 h-3 bg-stone-700" />
            <div className="w-24 h-8 bg-stone-700" />
          </div>
        </div>
        {/* Skeleton Right */}
        <div className="flex flex-col items-end gap-2">
          <div className="w-20 h-3 bg-stone-700" />
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-stone-700" />
            <div className="w-8 h-8 bg-stone-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-800 text-white p-4 rounded-xl shadow-lg border border-stone-700 flex items-center justify-between">
      {/* Left: Points */}
      <div className="flex items-center gap-4">
        <div className="bg-fiji-gold/20 p-3 rounded-full text-fiji-gold">
          <Trophy className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wider font-bold">
            Your Score
          </p>
          <p className="text-3xl font-bebas tracking-wide text-white">
            {points} PTS
          </p>
        </div>
      </div>

      {/* Right: Rank */}
      <div className="flex items-center gap-4 text-right">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wider font-bold">
            Current Rank
          </p>
          <div className="flex items-center justify-end gap-1">
            <span className="text-3xl font-bebas tracking-wide text-white">
              #{rank || "-"}
            </span>
            {rank === 1 && <Medal className="w-5 h-5 text-yellow-400" />}
          </div>
        </div>
      </div>
    </div>
  );
}
