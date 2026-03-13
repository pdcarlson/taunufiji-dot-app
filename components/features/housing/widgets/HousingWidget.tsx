"use client";

import {
  AlertCircle,
  Home,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface HousingWidgetProps {
  stats: {
    points: number;
    activeTasks: number;
    pendingReviews: number;
    housingHistory?: {
      id: string;
      reason: string;
      amount: number;
      category: string;
      timestamp: string;
    }[];
  };
  loading: boolean;
}

export default function HousingWidget({ stats, loading }: HousingWidgetProps) {
  // --- LOADING STATE (SKELETON) ---
  if (loading) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col justify-between h-[280px]">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-stone-200 rounded animate-pulse" />
              <div className="w-24 h-6 bg-stone-200 rounded animate-pulse" />
            </div>
            <div className="w-16 h-6 bg-stone-200 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="w-full h-12 bg-stone-100 rounded-lg animate-pulse" />
            <div className="w-3/4 h-4 bg-stone-100 rounded animate-pulse" />
            <div className="w-1/2 h-4 bg-stone-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="w-full h-10 bg-stone-100 rounded animate-pulse" />
      </div>
    );
  }

  // --- CONTENT STATE ---
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full min-h-[280px]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bebas text-2xl text-stone-700 flex items-center gap-2">
            <Home className="w-5 h-5 text-stone-400" /> Housing
          </h2>
          <span className="bg-fiji-gold/20 text-fiji-gold-dark px-2 py-1 rounded text-xs font-bold border border-fiji-gold/30">
            {stats.points} PTS
          </span>
        </div>

        <div className="space-y-4">
          {stats.pendingReviews > 0 ? (
            // ADMIN VIEW
            <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg flex items-center gap-3 border border-yellow-100 animate-in fade-in slide-in-from-bottom-2">
              <AlertCircle className="w-5 h-5" />
              <div className="text-sm">
                <span className="font-bold">{stats.pendingReviews} Proofs</span>{" "}
                need review.
              </div>
            </div>
          ) : stats.activeTasks > 0 ? (
            // ACTIVE USER VIEW
            <div className="bg-purple-50 text-fiji-purple p-3 rounded-lg flex items-center gap-3 border border-purple-100 animate-in fade-in slide-in-from-bottom-2">
              <Zap className="w-5 h-5 fill-current" />
              <div className="text-sm">
                You have{" "}
                <span className="font-bold">
                  {stats.activeTasks} active task
                  {stats.activeTasks > 1 ? "s" : ""}
                </span>{" "}
                due.
              </div>
            </div>
          ) : (
            // IDLE VIEW: Show History instead of valid whitespace
            <div className="space-y-3">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Recent Housing Activity
              </p>
              {stats.housingHistory && stats.housingHistory.length > 0 ? (
                <div className="space-y-2">
                  {stats.housingHistory.slice(0, 3).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between text-sm group"
                    >
                      <span className="text-stone-600 truncate max-w-[140px] group-hover:text-stone-900 transition-colors">
                        {tx.reason}
                      </span>
                      <span
                        className={`font-mono font-bold ${tx.amount >= 0 ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500 text-sm italic">
                  No recent tasks.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <Link
        href="/dashboard/housing"
        className="mt-6 w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded text-center text-sm transition-colors border border-stone-200"
      >
        Open Housing Board
      </Link>
    </div>
  );
}
