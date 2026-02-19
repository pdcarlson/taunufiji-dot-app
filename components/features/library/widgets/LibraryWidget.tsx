"use client";

import { BookOpen, Upload } from "lucide-react";
import Link from "next/link";

export default function LibraryWidget() {
  // const history = stats?.libraryHistory || []; // unused

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full min-h-[280px]">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bebas text-2xl text-stone-700 flex items-center gap-2">
            Library
          </h2>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-4">
          <div className="bg-fiji-purple/10 p-4 rounded-full">
            <BookOpen className="w-8 h-8 text-fiji-purple" />
          </div>
          <div>
            <p className="text-stone-600 font-medium">
              Contribute to the Archive
            </p>
            <p className="text-stone-400 text-sm mt-1">
              Upload exams and study materials.
            </p>
          </div>
          <p className="text-xs bg-stone-50 text-stone-500 px-3 py-1.5 rounded-full border border-stone-100">
            Earn <span className="text-fiji-purple font-bold">10 PTS</span> per
            upload
          </p>
        </div>
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
