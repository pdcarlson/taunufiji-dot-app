"use client";

import { BookOpen, Upload } from "lucide-react";
import Link from "next/link";

interface LibraryWidgetProps {
  stats?: {
    libraryHistory?: {
      id: string;
      reason: string;
      amount: number;
      category: string;
      timestamp: string;
    }[];
  };
}

export default function LibraryWidget({ stats }: LibraryWidgetProps) {
  const history = stats?.libraryHistory || [];

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full min-h-[280px]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bebas text-2xl text-stone-700 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-stone-400" /> Library
          </h2>
        </div>

        {history.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Recent Contributions
            </p>
            <div className="space-y-2">
              {history.slice(0, 3).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between text-sm group"
                >
                  <span className="text-stone-600 truncate max-w-[140px] group-hover:text-stone-900 transition-colors">
                    {tx.reason}
                  </span>
                  <span className="font-mono font-bold text-fiji-purple">
                    +{tx.amount}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-dashed border-stone-100">
              <p className="text-xs text-stone-400">
                Keep it up! Each upload is{" "}
                <span className="text-fiji-purple font-bold">10 PTS</span>.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-stone-500 text-sm mb-4 leading-relaxed">
            Contribute to the chapter archive. Earn{" "}
            <span className="text-fiji-purple font-bold">10 PTS</span> for every
            approved exam upload.
          </p>
        )}
      </div>

      <Link
        href="/dashboard/library/upload"
        className="mt-6 w-full py-3 bg-fiji-purple hover:bg-fiji-dark text-white font-bold rounded-lg text-center text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
      >
        <Upload className="w-4 h-4" /> Upload Backwork
      </Link>
    </div>
  );
}
