"use client";

import { Hand, Camera } from "lucide-react";
import { useState } from "react";
import AdHocRequestModal from "./AdHocRequestModal";
import toast from "react-hot-toast";

interface AdHocRequestCardProps {
  onSuccess?: () => void;
  variant?: "default" | "horizontal";
}

export default function AdHocRequestCard({
  onSuccess,
  variant = "default",
}: AdHocRequestCardProps) {
  const [showModal, setShowModal] = useState(false);

  if (variant === "horizontal") {
    return (
      <>
        <div className="relative bg-gradient-to-br from-fiji-gold to-amber-600 text-white border border-amber-500/30 rounded-xl p-4 flex items-center gap-6 shadow-sm hover:shadow-md transition-all group h-full overflow-hidden">
          {/* Background Flair */}
          <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Camera className="w-20 h-20 rotate-12" />
          </div>

          {/* ICON */}
          <div className="p-2.5 rounded-lg shrink-0 bg-white/20 text-white relative z-10">
            <Camera className="w-5 h-5" />
          </div>

          {/* CONTENT */}
          <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
            <h3 className="font-bebas text-xl text-white leading-none pt-0.5">
              Did something extra?
            </h3>
            <p className="text-amber-50/70 text-xs line-clamp-1">
              Cleaned up a mess? Fixed something? Submit a photo and get points!
            </p>
          </div>

          {/* ACTION */}
          <div className="shrink-0 w-[140px] relative z-10">
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Hand className="w-3.5 h-3.5" />
              Request Points
            </button>
          </div>
        </div>

        {showModal && (
          <AdHocRequestModal
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              if (onSuccess) onSuccess();
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-fiji-gold to-amber-600 text-white rounded-xl p-5 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-20 group-hover:opacity-30 transition-opacity">
          <Camera className="w-24 h-24 rotate-12" />
        </div>

        <div className="relative z-10 flex flex-col h-full justify-between gap-4">
          <div>
            <h3 className="font-bebas text-2xl leading-none mb-1">
              Did something extra?
            </h3>
            <p className="text-amber-100 text-sm font-medium leading-relaxed">
              Cleaned up a mess? Fixed something? Submit a photo and get points!
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 text-white font-bold py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
          >
            <Hand className="w-4 h-4" />
            Request Points
          </button>
        </div>
      </div>

      {showModal && (
        <AdHocRequestModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            if (onSuccess) onSuccess();
          }}
        />
      )}
    </>
  );
}
