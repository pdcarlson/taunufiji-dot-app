"use client";

import { AlertCircle, Home, Loader2, Zap } from "lucide-react";
import Link from "next/link";

interface HousingWidgetProps {
    stats: {
        points: number;
        activeTasks: number;
        pendingReviews: number;
    };
    loading: boolean;
}

export default function HousingWidget({ stats, loading }: HousingWidgetProps) {
    return (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bebas text-2xl text-stone-700 flex items-center gap-2">
                <Home className="w-5 h-5 text-stone-400" /> Housing
              </h2>
              <span className="bg-fiji-gold/20 text-fiji-gold-dark px-2 py-1 rounded text-xs font-bold border border-fiji-gold/30">
                {stats.points} PTS
              </span>
            </div>

            <div className="space-y-3">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
              ) : stats.pendingReviews > 0 ? (
                // ADMIN VIEW
                <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg flex items-center gap-3 border border-yellow-100">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-bold text-sm">
                    {stats.pendingReviews} Proofs need review.
                  </span>
                </div>
              ) : stats.activeTasks > 0 ? (
                // ACTIVE USER VIEW
                <div className="bg-purple-50 text-fiji-purple p-3 rounded-lg flex items-center gap-3 border border-purple-100">
                  <Zap className="w-5 h-5 fill-current" />
                  <span className="font-bold text-sm">
                    You have {stats.activeTasks} active task
                    {stats.activeTasks > 1 ? "s" : ""}.
                  </span>
                </div>
              ) : (
                // IDLE VIEW
                <p className="text-stone-500 text-sm italic">
                  You are all caught up. Check the board for new bounties.
                </p>
              )}
            </div>
          </div>

          <Link
            href="/dashboard/housing"
            className="mt-6 w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded text-center text-sm transition-colors"
          >
            Open Housing Board
          </Link>
        </div>
    );
}
