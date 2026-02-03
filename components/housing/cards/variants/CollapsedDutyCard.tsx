import { HousingTask } from "@/lib/domain/entities";
import { Briefcase, RefreshCw, Clock, ChevronDown } from "lucide-react";
import { TimeDisplay } from "../TimeDisplay";

interface CollapsedDutyCardProps {
  task: HousingTask;
  onClick: () => void;
  isActive: boolean;
}

export default function CollapsedDutyCard({
  task,
  onClick,
  isActive,
}: CollapsedDutyCardProps) {
  const isOneOff = task.type === "one_off";
  const isOverdue = task.due_at && new Date() > new Date(task.due_at);

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer bg-white border border-stone-200 rounded-lg p-3 flex items-center justify-between hover:bg-stone-50 transition-all ${
        isActive
          ? "ring-2 ring-fiji-purple border-transparent"
          : "hover:border-stone-300"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Icon */}
        <div
          className={`p-1.5 rounded-md ${
            isOneOff ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
          }`}
        >
          {isOneOff ? (
            <Briefcase className="w-4 h-4" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </div>

        {/* Text Details */}
        <div className="min-w-0">
          <h4 className="font-bebas text-lg text-stone-700 leading-none truncate group-hover:text-stone-900">
            {task.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            {task.due_at && (
              <span
                className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-500 font-bold" : "text-stone-400"}`}
              >
                <Clock className="w-3 h-3" />
                <TimeDisplay target={task.due_at} mode="deadline" />
              </span>
            )}
            {task.status === "rejected" && (
              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold uppercase">
                Redo
              </span>
            )}
          </div>
        </div>
      </div>

      <ChevronDown className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" />
    </div>
  );
}
