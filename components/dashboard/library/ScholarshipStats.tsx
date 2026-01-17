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
      <div className="flex items-center gap-3 md:gap-4 p-2">
        <div className="bg-blue-50 p-2 md:p-3 rounded-full text-blue-600 transition-colors">
          <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <p className="text-[10px] md:text-xs text-stone-400 uppercase tracking-wider font-bold">
            Total Archive
          </p>
          <p className="text-2xl font-bebas tracking-wide text-stone-800 leading-none">
            {totalArchives} Files
          </p>
        </div>
      </div>

      {/* My Contributions */}
      <div className="flex items-center gap-3 md:gap-4 p-2 border-t md:border-t-0 md:border-l border-stone-100 pt-4 md:pt-2 md:pl-6">
        <div className="bg-fiji-gold/20 p-2 md:p-3 rounded-full text-fiji-gold-dark transition-colors">
          <Trophy className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <p className="text-[10px] md:text-xs text-stone-400 uppercase tracking-wider font-bold">
            Your Uploads
          </p>
          <p className="text-2xl font-bebas tracking-wide text-stone-800 leading-none">
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
