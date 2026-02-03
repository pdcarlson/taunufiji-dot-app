import { HousingTask } from "@/lib/domain/entities";
import { Zap, Briefcase, RefreshCw, Eye } from "lucide-react";

interface ReviewCardProps {
  task: HousingTask;
  onReview: (task: HousingTask) => void;
}

export default function ReviewCard({ task, onReview }: ReviewCardProps) {
  const isDuty = task.type === "duty" || task.type === "one_off";
  const isOneOff = task.type === "one_off";

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 flex items-center gap-4 hover:shadow-md transition-shadow group">
      {/* Type Badge */}
      <div className="flex-shrink-0">
        {isDuty ? (
          <div className="p-2 rounded-md bg-red-50 text-red-500">
            {isOneOff ? (
              <Briefcase className="w-5 h-5" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
          </div>
        ) : (
          <div className="p-2 rounded-md bg-yellow-50 text-fiji-gold">
            <Zap className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bebas text-xl text-stone-800 truncate group-hover:text-fiji-purple transition-colors">
          {task.title}
        </h3>
        <p className="text-stone-500 text-sm truncate">{task.description}</p>
      </div>

      {/* Points (Bounty Only) */}
      {!isDuty && (
        <span className="bg-fiji-gold text-white text-sm font-bold px-3 py-1.5 rounded shadow-sm whitespace-nowrap">
          {task.points_value} PTS
        </span>
      )}

      {/* Review Button */}
      <button
        onClick={() => onReview(task)}
        className="bg-stone-800 hover:bg-black text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex items-center gap-2"
      >
        <Eye className="w-4 h-4" />
        Review
      </button>
    </div>
  );
}
