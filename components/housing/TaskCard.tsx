"use client";

import { HousingTask } from "@/lib/domain/entities";
import LockedCard from "./cards/variants/LockedCard";
import BountyCard from "./cards/variants/BountyCard";
import DutyCard from "./cards/variants/DutyCard";
import ReviewCard from "./cards/variants/ReviewCard";

interface TaskCardProps {
  task: HousingTask;
  userId: string;
  profileId?: string;
  userName?: string;
  isAdmin: boolean;
  getJWT: () => Promise<string>;
  viewMode?: "action" | "review";
  onReview?: (task: HousingTask) => void;
  onEdit?: (task: HousingTask) => void;
  variant?: "square" | "horizontal";
}

// SKELETON
export function TaskCardSkeleton() {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col h-[200px] animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-2">
          <div className="w-20 h-4 bg-stone-200 rounded" />
          <div className="w-32 h-6 bg-stone-200 rounded" />
        </div>
        <div className="w-16 h-6 bg-stone-200 rounded" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="w-full h-4 bg-stone-200 rounded" />
        <div className="w-3/4 h-4 bg-stone-200 rounded" />
      </div>
      <div className="pt-3 border-t border-stone-100">
        <div className="w-full h-8 bg-stone-200 rounded" />
      </div>
    </div>
  );
}

// DISPATCHER COMPONENT
export default function TaskCard(props: TaskCardProps) {
  const { task, viewMode = "action", variant = "square" } = props;

  // 1. LOCKED / COOLDOWN
  if (task.status === "locked") {
    return <LockedCard task={task} />;
  }

  // 2. REVIEW MODE (Admin Queue)
  if (viewMode === "review" && props.onReview) {
    return <ReviewCard task={task} onReview={props.onReview} />;
  }

  // 3. HORIZONTAL BOUNTY (Available Bounties)
  if (
    variant === "horizontal" &&
    task.type === "bounty" &&
    task.status === "open"
  ) {
    return (
      <BountyCard
        task={task}
        userId={props.userId}
        getJWT={props.getJWT}
        onEdit={props.onEdit}
      />
    );
  }

  // 4. DUTY CARD / ACTIVE CARD (Default for My Duties)
  // This handles: Assigned Duties, Claimed Bounties, Open Duties
  return (
    <DutyCard
      task={task}
      userId={props.userId}
      getJWT={props.getJWT}
      onEdit={props.onEdit}
    />
  );
}
