"use client";

import { Hand, Camera } from "lucide-react";
import { useState } from "react";
import AdHocRequestModal from "./AdHocRequestModal";
import toast from "react-hot-toast";

interface AdHocRequestCardProps {
  onSuccess?: () => void;
}

export default function AdHocRequestCard({ onSuccess }: AdHocRequestCardProps) {
  const [showModal, setShowModal] = useState(false);

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
