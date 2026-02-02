import { Trophy } from "lucide-react";
import { Suspense } from "react";
import LeaderboardList from "@/components/features/leaderboard/components/LeaderboardList";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

function LeaderboardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden space-y-4 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <div className="pb-24 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-8 h-8 text-fiji-gold" />
        <h1 className="font-bebas text-3xl text-stone-900">Leaderboard</h1>
      </div>

      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardList />
      </Suspense>
    </div>
  );
}
