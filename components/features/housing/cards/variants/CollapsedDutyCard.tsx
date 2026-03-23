import { HousingTask } from "@/lib/domain/entities";
import { ChevronRight, Zap, RefreshCw, Briefcase } from "lucide-react";
import { TimeDisplay } from "../TimeDisplay";
import {
  isAwaitingExpiryTransition,
  isAssigneeNotCompletable,
} from "@/lib/utils/housing-assignee-task-state";

interface CollapsedDutyCardProps {
  task: HousingTask;
  onClick: () => void;
}

export default function CollapsedDutyCard({
  task,
  onClick,
}: CollapsedDutyCardProps) {
  const isPending = task.status === "pending";
  const isRejected = task.status === "rejected";
  const isCompleted = task.status === "approved";

  const isDuty = task.type === "duty" || task.type === "one_off";
  const isOneOff = task.type === "one_off";
  const dutyLimbo = isDuty && isAwaitingExpiryTransition(task);
  const notCompletable = isAssigneeNotCompletable(task);

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
        {isPending && dutyLimbo && (
          <span
            className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded"
            title="Past due — awaiting system or admin to mark expired"
          >
            Awaiting update
          </span>
        )}
        {isPending && !dutyLimbo && (
          <span
            className="w-2 h-2 rounded-full bg-fiji-gold animate-pulse"
            title="Pending"
          />
        )}
        {notCompletable && task.status === "expired" && (
          <span
            className="text-[10px] font-bold uppercase tracking-wide text-stone-600 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded"
            title="Not completable"
          >
            Expired
          </span>
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
