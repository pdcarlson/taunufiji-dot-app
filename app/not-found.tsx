"use client";

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 bg-stone-200 rounded-3xl flex items-center justify-center mb-4 transform rotate-3">
          <SearchX className="w-12 h-12 text-stone-500" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="font-bebas text-6xl text-stone-900 tracking-tighter">
            Lost in the Archives
          </h1>
          <p className="text-stone-500 text-lg">
            The page you are looking for has been moved, removed, or never
            existed.
          </p>
        </div>

        {/* Action */}
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-stone-900 text-white px-8 py-4 rounded-xl font-bold transition-all hover:bg-stone-800 hover:-translate-y-1 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="w-5 h-5" />
            Return to Dashboard
          </Link>
        </div>

        <div className="pt-12 text-xs font-bold text-stone-300 uppercase tracking-widest">
          Tau Nu Chapter • Phi Gamma Delta
        </div>
      </div>
    </div>
  );
}
