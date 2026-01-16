"use client";

import { BookOpen, Upload } from "lucide-react";
import Link from "next/link";

export default function LibraryWidget() {
    return (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bebas text-2xl text-stone-700 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-stone-400" /> Library
              </h2>
            </div>
            <p className="text-stone-500 text-sm mb-4 leading-relaxed">
              Contribute to the chapter archive. Earn{" "}
              <span className="text-fiji-purple font-bold">10 PTS</span> for
              every approved exam upload.
            </p>
          </div>

          <Link
            href="/dashboard/library/upload"
            className="w-full py-3 bg-fiji-purple hover:bg-fiji-dark text-white font-bold rounded-lg text-center text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
          >
            <Upload className="w-4 h-4" /> Upload Backwork
          </Link>
        </div>
    );
}
