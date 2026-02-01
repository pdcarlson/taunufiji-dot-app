import { createSessionClient } from "@/lib/presentation/server/appwrite";
import { getContainer } from "@/lib/infrastructure/container";
import { redirect } from "next/navigation";
import { getDashboardStatsAction } from "@/lib/presentation/actions/dashboard.actions";
import HousingWidget from "@/components/dashboard/HousingWidget";
import LibraryWidget from "@/components/dashboard/LibraryWidget";
import LeaderboardWidget from "@/components/dashboard/LeaderboardWidget";
import MyDutiesWidget from "@/components/features/housing/MyDutiesWidget";
import { HousingTask } from "@/lib/domain/types/task";

export default async function DashboardHome() {
  // 1. Auth & Session
  let user;
  try {
    const { account } = await createSessionClient();
    user = await account.get();
  } catch (error) {
    redirect("/login");
  }

  // 2. Fetch Data (Parallel)
  const container = getContainer();

  // Resolve Profile first
  const profile = await container.authService.getProfile(user.$id);
  if (!profile) {
    return <div>Error loading profile.</div>;
  }

  const [stats, myTasksRes] = await Promise.all([
    getDashboardStatsAction(user.$id),
    container.dutyService.getMyTasks(profile.discord_id),
  ]);

  const myTasks = (myTasksRes?.documents || []) as HousingTask[];

  // 3. Greeting Logic
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  const getLastName = (nameProp: string) => {
    if (!nameProp || nameProp === "Brother") return "";
    const clean = nameProp.trim();
    if (clean.includes(" ")) {
      const parts = clean.split(" ");
      return parts[parts.length - 1];
    }
    if (clean.includes(".")) {
      const parts = clean.split(".");
      const last = parts[parts.length - 1];
      return last.charAt(0).toUpperCase() + last.slice(1);
    }
    return clean;
  };

  const lastName = getLastName(stats.fullName);
  const displayName = lastName ? `Brother ${lastName}` : "Brother";

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

      {/* NEW: MY DUTIES WIDGET */}
      <MyDutiesWidget initialTasks={myTasks} userId={user.$id} />

      {/* WIDGET GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Housing Stats (Old Widget kept for Stats/Admin) */}
        <HousingWidget stats={stats} loading={false} />
        {/* 2. Library (Static) */}
        <LibraryWidget stats={stats} />
        {/* 3. Leaderboard */}
        <LeaderboardWidget />
      </div>
    </div>
  );
}
