"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect, useState } from "react";
import HousingWidget from "@/components/dashboard/HousingWidget";
import LibraryWidget from "@/components/dashboard/LibraryWidget";
import LeaderboardWidget from "@/components/dashboard/LeaderboardWidget";
import { getDashboardStatsAction } from "@/lib/presentation/actions/dashboard.actions";

import { DashboardStats } from "@/lib/domain/entities/dashboard";

export default function DashboardHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    points: 0,
    activeTasks: 0,
    pendingReviews: 0,
    fullName: "",
    housingHistory: [],
    libraryHistory: [],
  });

  // Fetch Stats
  useEffect(() => {
    async function load() {
      if (!user) return;
      const data = await getDashboardStatsAction(user.$id);
      setStats(data);
      setLoading(false);
    }
    load();
  }, [user?.$id]);

  // Dynamic Greeting Logic
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  // Name Logic: Smart Last Name Extractor
  const getLastName = (nameProp: string) => {
    if (!nameProp || nameProp === "Brother") return ""; // Return empty to avoid "Brother Brother"

    const clean = nameProp.trim();

    // Case 1: "Pierce Carlson" -> "Carlson"
    if (clean.includes(" ")) {
      const parts = clean.split(" ");
      return parts[parts.length - 1];
    }

    // Case 2: "p.carlson" -> "Carlson" (Handle/Email format)
    if (clean.includes(".")) {
      const parts = clean.split(".");
      const last = parts[parts.length - 1];
      // Ensure capitalization
      return last.charAt(0).toUpperCase() + last.slice(1);
    }

    // Case 3: "Pierce" -> "Pierce"
    return clean;
  };

  const lastName = getLastName(loading ? "" : stats.fullName);
  const displayName = lastName ? `Brother ${lastName}` : "Brother"; // Handles "Brother Carlson" or just "Brother"

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HERO SECTION */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden border border-white/5">
        {/* Background Texture */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-fiji-purple opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10">
          <h1 className="font-bebas text-5xl mb-2 tracking-wide">
            {greeting}, {displayName}.
          </h1>
          <div className="max-w-2xl">
            <p className="text-stone-400 font-serif italic text-lg leading-relaxed border-l-4 border-fiji-purple pl-4 my-6">
              &quot;Nothing in the world can take the place of persistence.
              Talent will not... Genius will not... Education will not...
              Persistence and determination alone are omnipotent.&quot;
            </p>
            <p className="text-sm text-stone-500 font-bold uppercase tracking-widest">
              — Calvin Coolidge (Amherst College, 1895)
            </p>
          </div>
        </div>
      </div>

      {/* WIDGET GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Housing */}
        <HousingWidget stats={stats} loading={loading} />
        {/* 2. Library (Static) */}
        <LibraryWidget stats={stats} />
        {/* 3. Leaderboard */}
        <LeaderboardWidget />
      </div>
    </div>
  );
}
