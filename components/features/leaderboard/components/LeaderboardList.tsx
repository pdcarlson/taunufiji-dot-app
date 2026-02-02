"use client";

import { useEffect, useState } from "react";
import { getLeaderboardAction } from "@/lib/presentation/actions/dashboard.actions";
import { Medal, Loader2 } from "lucide-react";
import { LeaderboardEntry } from "@/lib/domain/entities/user.entity";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LeaderboardList() {
  const { user, getToken } = useAuth();
  const [users, setUsers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      try {
        const token = await getToken();
        const data = await getLeaderboardAction(token);
        setUsers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-stone-300" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden animate-in fade-in duration-500">
      <div className="grid grid-cols-12 gap-4 p-4 border-b border-stone-100 bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-widest">
        <div className="col-span-2 text-center">Rank</div>
        <div className="col-span-7">Brother</div>
        <div className="col-span-3 text-right">Points</div>
      </div>

      {users.map((entry, index) => (
        <div
          key={entry.id || index}
          className="grid grid-cols-12 gap-4 p-4 items-center border-b border-stone-50 hover:bg-stone-50 transition-colors"
        >
          <div className="col-span-2 flex justify-center">
            {index === 0 && <Medal className="w-6 h-6 text-yellow-500" />}
            {index === 1 && <Medal className="w-6 h-6 text-gray-400" />}
            {index === 2 && <Medal className="w-6 h-6 text-amber-700" />}
            {index > 2 && (
              <span className="font-bebas text-xl text-stone-400">
                #{index + 1}
              </span>
            )}
          </div>
          <div className="col-span-7 font-bold text-stone-800">
            {entry.name}
          </div>
          <div className="col-span-3 text-right font-mono text-fiji-purple font-bold">
            {entry.points}
          </div>
        </div>
      ))}

      {users.length === 0 && (
        <div className="p-8 text-center text-stone-500">No data yet.</div>
      )}
    </div>
  );
}
