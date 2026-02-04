"use client";

import { useState } from "react";
import { HousingTask } from "@/lib/domain/entities";
import { claimTaskAction } from "@/lib/presentation/actions/housing/duty.actions";
import { Loader } from "@/components/ui/Loader";
import toast from "react-hot-toast";

interface BountyCardProps {
  task: HousingTask;
  userId: string;
  getJWT: () => Promise<string>;
  onEdit?: (task: HousingTask) => void;
}

export default function BountyCard({
  task,
  userId,
  getJWT,
  onEdit,
}: BountyCardProps) {
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    try {
      const jwt = await getJWT();
      const res = await claimTaskAction(task.id, userId, jwt);
      if (!res.success) throw new Error(res.error);
      toast.success("Bounty Claimed!");
      // We rely on parent to refresh or optimistic update?
      // The original code called onRefresh(). properties passed didn't include onRefresh?
      // Wait, TaskCardProps HAS onRefresh. But BountyCardProps in TaskCard.tsx DOES NOT pass it?
      // Let's check TaskCard.tsx usages.
      window.location.reload(); // Fallback if no refresh provided, or better: just toast.
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error claiming task";
      toast.error(message);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bebas text-xl text-stone-800 truncate">
          {task.title}
        </h3>
        <p className="text-stone-500 text-sm truncate">{task.description}</p>
      </div>

      {/* Points */}
      <span className="bg-fiji-gold text-white text-sm font-bold px-3 py-1.5 rounded shadow-sm whitespace-nowrap">
        {task.points_value} PTS
      </span>

      {/* Claim Button */}
      <button
        onClick={handleClaim}
        disabled={loading}
        className="bg-fiji-purple hover:bg-fiji-dark text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader size="sm" className="text-white" />
            Claiming...
          </>
        ) : (
          "Claim"
        )}
      </button>
    </div>
  );
}
