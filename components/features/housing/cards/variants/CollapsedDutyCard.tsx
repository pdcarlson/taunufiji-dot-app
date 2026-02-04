import { HousingTask } from "@/lib/domain/entities";
import {
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Zap,
  RefreshCw,
  Briefcase,
} from "lucide-react";
import { TimeDisplay } from "../TimeDisplay";

interface CollapsedDutyCardProps {
  task: HousingTask;
  isActive: boolean;
  onClick: () => void;
}

export default function CollapsedDutyCard({
  task,
  isActive,
  onClick,
}: CollapsedDutyCardProps) {
  const isPending = task.status === "pending";
  const isRejected = task.status === "rejected";
  const isCompleted = task.status === "approved";

  const isDuty = task.type === "duty" || task.type === "one_off";
  const isOneOff = task.type === "one_off";

  return (
    <div
      onClick={onClick}
      className="bg-white border border-stone-200 hover:border-fiji-purple/50 rounded-lg p-4 flex items-center justify-between cursor-pointer group transition-all hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        {/* Type Icon */}
        <div className="text-stone-400">
          {isDuty ? (
            isOneOff ? (
              <Briefcase className="w-4 h-4" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )
          ) : (
            <Zap className="w-4 h-4 text-fiji-gold" />
          )}
        </div>

        {/* Title */}
        <h3 className="font-bebas text-lg text-stone-700 group-hover:text-fiji-dark">
          {task.title}
        </h3>

        {/* Status Mini-Badges */}
        {isPending && (
          <span
            className="w-2 h-2 rounded-full bg-fiji-gold animate-pulse"
            title="Pending"
          />
        )}
        {isRejected && (
          <span className="w-2 h-2 rounded-full bg-red-500" title="Rejected" />
        )}
        {isCompleted && (
          <span
            className="w-2 h-2 rounded-full bg-green-500"
            title="Completed"
          />
        )}
      </div>

      <div className="flex items-center gap-4 text-stone-400">
        {task.due_at && (
          <div className="hidden sm:block">
            <TimeDisplay target={task.due_at} mode="deadline" />
          </div>
        )}
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}
