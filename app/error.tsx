"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 bg-red-100 rounded-3xl flex items-center justify-center mb-4 transform -rotate-3">
          <AlertOctagon className="w-12 h-12 text-red-600" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="font-bebas text-5xl text-stone-900 tracking-tighter">
            Something Went Wrong
          </h1>
          <p className="text-stone-500">
            The application encountered an unexpected error. The Council has
            been notified.
          </p>
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg text-left overflow-auto max-h-40 border border-red-100">
              <p className="font-mono text-xs text-red-800 break-all">
                {error.message}
              </p>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="pt-4 flex w-full gap-4">
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white border border-stone-200 text-stone-700 px-6 py-3 rounded-xl font-bold transition-all hover:bg-stone-50"
          >
            Go Home
          </button>
          <button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
            className="flex-1 inline-flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-bold transition-all hover:bg-stone-800 hover:shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
