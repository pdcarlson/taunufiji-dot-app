"use client";

import { Trophy, BookOpen, AlertCircle } from "lucide-react";

interface StatsProps {
  totalArchives: number;
  myContributions: number;
  pendingReviews?: number;
}

export default function ScholarshipStats({
  totalArchives,
  myContributions,
  pendingReviews = 0,
}: StatsProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Archives */}
      <div className="flex items-center gap-4 p-2">
        <div className="bg-blue-50 p-3 rounded-full text-blue-600">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wider font-bold">
            Total Archive
          </p>
          <p className="text-2xl font-bebas tracking-wide text-stone-800">
            {totalArchives} Files
          </p>
        </div>
      </div>

      {/* My Contributions */}
      <div className="flex items-center gap-4 p-2 border-l border-stone-100 pl-6">
        <div className="bg-fiji-gold/20 p-3 rounded-full text-fiji-gold-dark">
          <Trophy className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wider font-bold">
            Your Uploads
          </p>
          <p className="text-2xl font-bebas tracking-wide text-stone-800">
            {myContributions} Files
          </p>
        </div>
      </div>

      {/* Admin Review (Conditional) */}
      {pendingReviews > 0 && (
        <div className="flex items-center gap-4 p-2 bg-red-50 rounded-lg border border-red-100">
          <div className="bg-red-100 p-3 rounded-full text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-red-400 uppercase tracking-wider font-bold">
              Action Required
            </p>
            <p className="text-2xl font-bebas tracking-wide text-red-700">
              {pendingReviews} Pending
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
