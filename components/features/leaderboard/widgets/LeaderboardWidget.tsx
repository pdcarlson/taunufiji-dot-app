"use client";

import { useEffect, useState, useCallback, useRef } from "react";
// import { getLeaderboard } from "@/lib/tasks"; // Need to check where this function is in internal-os
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getLeaderboardAction,
  getMyRankAction,
} from "@/lib/presentation/actions/dashboard.actions";
import { Trophy, Medal, Crown, Loader2, AlertCircle } from "lucide-react";
import clsx from "clsx";

interface LeaderboardMember {
  id: string;
  userId?: string;
  name: string;
  points: number;
  rank?: number;
}

interface LeaderboardWidgetProps {
  initialLeaderboard?: LeaderboardMember[];
  initialLeaderboardPrefetched?: boolean;
}

export default function LeaderboardWidget({
  initialLeaderboard,
  initialLeaderboardPrefetched = false,
}: LeaderboardWidgetProps) {
  const { user, getToken } = useAuth();
  const propProvided = initialLeaderboard !== undefined;
  const prefetched = initialLeaderboardPrefetched === true;
  const [leaders, setLeaders] = useState<LeaderboardMember[]>(
    initialLeaderboard ?? [],
  );
  const [myStats, setMyStats] = useState<{
    rank: number;
    points: number;
  } | null>(null);
  const [loading, setLoading] = useState(
    !prefetched && (initialLeaderboard ?? []).length === 0,
  );
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(prefetched);

  useEffect(() => {
    setLeaders(initialLeaderboard ?? []);
    hasFetchedRef.current = prefetched || (initialLeaderboard?.length ?? 0) > 0;

    if (prefetched || (initialLeaderboard?.length ?? 0) > 0) {
      setError(null);
      setLoading(false);
    }
  }, [initialLeaderboard, prefetched]);

  // Helper to handle conditional my-rank call
  const getLeadersMyRank = useCallback(
    async (token: string): Promise<{ rank: number; points: number } | null> => {
      // If we are authorized, we can get rank.
      // The action handles internal logic.
      return await getMyRankAction(token);
    },
    [],
  );

  const fetchLeaders = useCallback(async () => {
    try {
      if (!user) return;

      const token = await getToken();

      const leadersPromise: Promise<LeaderboardMember[] | null> =
        hasFetchedRef.current || prefetched
          ? Promise.resolve(null)
          : (getLeaderboardAction(token) as Promise<LeaderboardMember[]>);
      const [rankResult, leadersResult] = await Promise.allSettled([
        getLeadersMyRank(token),
        leadersPromise,
      ]);

      if (leadersResult.status === "fulfilled" && leadersResult.value) {
        setLeaders(leadersResult.value);
        setError(null);
        hasFetchedRef.current = true;
      } else if (leadersResult.status === "rejected") {
        const reason =
          leadersResult.reason instanceof Error
            ? leadersResult.reason.message
            : String(leadersResult.reason);
        console.error("Leaderboard fetch failed", reason);
        setError("Unable to load leaderboard");
      }

      if (rankResult.status === "fulfilled") {
        setMyStats(rankResult.value);
      } else {
        console.error("Leaderboard rank fetch failed", rankResult.reason);
        setMyStats(null);
      }
    } catch (err) {
      console.error("Leaderboard error:", err);
      if (!hasFetchedRef.current && !prefetched) {
        setError("Unable to load leaderboard");
      }
    } finally {
      setLoading(false);
    }
  }, [user, getToken, prefetched, getLeadersMyRank]);

  useEffect(() => {
    // If we have initial data, we only need to fetch user rank if user is present
    if (user) {
      fetchLeaders();
    } else if (prefetched && (initialLeaderboard?.length ?? 0) === 0) {
      setLoading(false);
      setError(null);
    } else if (propProvided && (initialLeaderboard?.length ?? 0) > 0) {
      setLoading(false);
      setError(null);
    } else if (
      !user &&
      !prefetched &&
      (initialLeaderboard?.length ?? 0) === 0
    ) {
      setLoading(false);
      setError(null);
    }
  }, [
    user,
    fetchLeaders,
    propProvided,
    prefetched,
    initialLeaderboard?.length,
  ]);

  // Standardized Name Formatter
  const formatName = (fullName: string) => {
    if (!fullName) return "Brother";
    const cleanName = fullName.replace(/^Brother\s+/i, "").trim();
    const parts = cleanName.split(" ");
    const targetName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    return `Brother ${targetName}`;
  };

  // Find my stats
  // Prioritize fetched myStats, fallback to list search (for consistency/optimistic)
  const listIndex = leaders.findIndex(
    (member) => (member.userId ?? member.id) === user?.$id,
  );
  const fallbackRank =
    listIndex !== -1 ? (leaders[listIndex]?.rank ?? listIndex + 1) : "-";

  const displayRank = myStats?.rank ?? fallbackRank;
  const displayPoints =
    myStats?.points ?? (listIndex !== -1 ? leaders[listIndex].points : 0);

  if (loading) {
    return (
      <div className="w-full rounded-xl border border-stone-800 bg-stone-900 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-xl border border-red-900/50 bg-stone-900 p-6 flex flex-col items-center justify-center text-center">
        <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
        <span className="text-red-400 font-bebas tracking-wide text-sm">
          {error}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-stone-800 bg-stone-900 shadow-xl flex flex-col relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-fiji-gold/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="p-6 pb-2 relative z-10 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-fiji-gold" />
          <h3 className="font-bebas text-2xl text-fiji-gold tracking-wide pt-1 uppercase">
            Rankings
          </h3>
        </div>
        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
          Top 5
        </span>
      </div>

      {/* List */}
      <div className="p-4 space-y-2 flex-1 relative z-10">
        {leaders.length === 0 ? (
          <div className="text-center text-stone-500 py-8 font-bebas tracking-wide">
            No active rankings.
          </div>
        ) : (
          leaders.slice(0, 5).map((member, index) => (
            <div
              key={member.id}
              className={clsx(
                "flex items-center justify-between rounded-lg p-2 transition-all",
                // Styling for #1 vs others
                index === 0
                  ? "bg-gradient-to-r from-fiji-gold/10 to-transparent border border-fiji-gold/20"
                  : "hover:bg-white/5 border border-transparent",
              )}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="flex w-6 items-center justify-center">
                  {index === 0 ? (
                    <Crown className="h-4 w-4 text-fiji-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
                  ) : index === 1 ? (
                    <Medal className="h-4 w-4 text-stone-300" />
                  ) : index === 2 ? (
                    <Medal className="h-4 w-4 text-amber-700" />
                  ) : (
                    <span className="font-bebas text-sm text-stone-600">
                      #{index + 1}
                    </span>
                  )}
                </div>

                {/* Name */}
                <span
                  className={clsx(
                    "font-bebas tracking-wide text-lg",
                    index === 0 ? "text-fiji-gold" : "text-stone-300",
                  )}
                >
                  {formatName(member.name)}
                </span>
              </div>

              {/* Points */}
              <span className="font-bebas text-lg text-white">
                {member.points}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer: My Stats */}
      {user && (
        <div className="bg-stone-950/50 p-3 border-t border-white/5 flex items-center justify-between px-6">
          <span className="text-xs text-stone-500 font-bold uppercase tracking-wider">
            Your Rank
          </span>
          <div className="flex items-center gap-2">
            <span className="text-fiji-purple font-bebas text-lg">
              #{displayRank}
            </span>
            <span className="text-stone-600 text-xs">/</span>
            <span className="text-white font-bebas text-lg">
              {displayPoints} PTS
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
