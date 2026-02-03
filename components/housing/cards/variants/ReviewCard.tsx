import { HousingTask } from "@/lib/domain/entities";
import { Briefcase, RefreshCw, Zap } from "lucide-react";
import { TimeDisplay } from "../TimeDisplay";

interface ReviewCardProps {
  task: HousingTask;
  onReview: (task: HousingTask) => void;
}

export default function ReviewCard({ task, onReview }: ReviewCardProps) {
  const isOneOff = task.type === "one_off";
  const isDuty = task.type === "duty" || task.type === "one_off";

  return (
    <div className="relative bg-white border border-stone-200 rounded-xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col h-full group">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-3">
        <div>
          {isDuty ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] tracking-widest font-bold text-red-600 bg-red-50 border border-red-100 uppercase mb-2">
              {isOneOff ? (
                <Briefcase className="w-3 h-3" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {isOneOff ? "Assigned Duty" : "Recurring Duty"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] tracking-widest font-bold text-fiji-gold-dark bg-yellow-50 border border-yellow-100 uppercase mb-2">
              <Zap className="w-3 h-3" /> Bounty
            </span>
          )}
          <h3 className="font-bebas text-2xl text-stone-800 leading-none group-hover:text-fiji-dark transition-colors">
            {task.title}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          {!isDuty && (
            <span className="bg-fiji-gold text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
              {task.points_value} PTS
            </span>
          )}
          {task.due_at && <TimeDisplay target={task.due_at} mode="deadline" />}
        </div>
      </div>

      <p className="text-stone-600 text-sm mb-4 flex-1 line-clamp-3 leading-relaxed">
        {task.description}
      </p>

      {/* FOOTER ACTIONS */}
      <div className="pt-3 border-t border-stone-100 space-y-2">
        <button
          onClick={() => onReview(task)}
          className="w-full bg-stone-800 hover:bg-black text-white font-bold py-2 rounded text-sm shadow-sm transition-all hover:shadow"
        >
          Review Proof
        </button>
      </div>
    </div>
  );
}
