
import { getLeaderboardAction } from "@/lib/actions/housing.actions";
import { Medal, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const users = await getLeaderboardAction();

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-8 h-8 text-fiji-gold" />
        <h1 className="font-bebas text-3xl text-stone-900">Leaderboard</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-stone-100 bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-widest">
            <div className="col-span-2 text-center">Rank</div>
            <div className="col-span-7">Brother</div>
            <div className="col-span-3 text-right">Points</div>
        </div>
        
        {users.map((user: any, index: number) => (
            <div key={user.$id} className="grid grid-cols-12 gap-4 p-4 items-center border-b border-stone-50 hover:bg-stone-50 transition-colors">
                <div className="col-span-2 flex justify-center">
                    {index === 0 && <Medal className="w-6 h-6 text-yellow-500" />}
                    {index === 1 && <Medal className="w-6 h-6 text-gray-400" />}
                    {index === 2 && <Medal className="w-6 h-6 text-amber-700" />}
                    {index > 2 && <span className="font-bebas text-xl text-stone-400">#{index + 1}</span>}
                </div>
                <div className="col-span-7 font-bold text-stone-800">
                    {user.full_name || user.discord_handle || "Unknown"}
                    <div className="text-xs text-stone-400 font-normal">@{user.discord_handle}</div>
                </div>
                <div className="col-span-3 text-right font-mono text-fiji-purple font-bold">
                    {user.details_points_current || 0}
                </div>
            </div>
        ))}

        {users.length === 0 && (
            <div className="p-8 text-center text-stone-500">
                No data yet.
            </div>
        )}
      </div>
    </div>
  );
}
