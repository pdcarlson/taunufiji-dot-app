"use client";

import {
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  RefreshCw,
  Briefcase,
  Pen,
} from "lucide-react";
import { HousingTask, Member } from "@/lib/domain/entities";
import { HOUSING_CONSTANTS } from "@/lib/constants";

interface DutyRosterProps {
  tasks: HousingTask[];
  members: Member[];
  isAdmin: boolean;
  onRefresh: () => void;
  onEdit?: (task: HousingTask) => void;
}

export default function DutyRoster({
  tasks,
  members,
  isAdmin,
  onRefresh,
  onEdit,
}: DutyRosterProps) {
  // Filter: All tasks, exclude approved/expired older than X days
  const recentThreshold = new Date();
  recentThreshold.setDate(recentThreshold.getDate() - HOUSING_CONSTANTS.RECENT_TASK_THRESHOLD_DAYS);

  const filteredTasks = tasks.filter((t) => {
    // Always show open, pending, rejected, locked
    if (["open", "pending", "rejected", "locked"].includes(t.status))
      return true;

    // For approved/expired, only show if recent
    const updatedAt = new Date(t.updatedAt);
    return updatedAt > recentThreshold;
  });

  // Sort: Open/Pending first, then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const statusOrder = {
      open: 0,
      pending: 1,
      rejected: 2,
      locked: 3,
      approved: 4,
      expired: 5,
    };
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 99;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;

    // Then by due date (soonest first)
    const aDue = a.due_at ? new Date(a.due_at).getTime() : Infinity;
    const bDue = b.due_at ? new Date(b.due_at).getTime() : Infinity;
    return aDue - bDue;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bounty":
        return <Zap className="w-3 h-3 text-yellow-500" />;
      case "duty":
        return <RefreshCw className="w-3 h-3 text-blue-500" />;
      case "one_off":
        return <Briefcase className="w-3 h-3 text-purple-500" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "bounty":
        return "Bounty";
      case "duty":
        return "Recurring";
      case "one_off":
        return "One-off";
      default:
        return type;
    }
  };

  const getStatusBadge = (task: HousingTask) => {
    const isOverdue =
      task.due_at &&
      new Date() > new Date(task.due_at) &&
      task.status === "open";

    if (task.status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold">
          <CheckCircle className="w-3 h-3" /> Done
        </span>
      );
    }
    if (task.status === "locked") {
      return (
        <span className="inline-flex items-center gap-1 text-stone-400 text-xs font-bold">
          <Clock className="w-3 h-3" /> Locked
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold">
          <AlertCircle className="w-3 h-3" /> Overdue
        </span>
      );
    }
    if (task.status === "pending" && task.proof_s3_key) {
      return (
        <span className="inline-flex items-center gap-1 text-orange-500 text-xs font-bold">
          <Clock className="w-3 h-3" /> Review
        </span>
      );
    }
    if (task.status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 text-blue-500 text-xs font-bold">
          <Clock className="w-3 h-3" /> In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-stone-500 text-xs font-bold">
        <Clock className="w-3 h-3" /> Open
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
          <div>
            <h2 className="font-bebas text-2xl text-stone-700">
              Master Task Roster
            </h2>
            <p className="text-stone-500 text-sm">
              All active and recent tasks in the system.
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 text-stone-400 hover:text-fiji-purple transition-colors"
            title="Refresh Roster"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-stone-400 font-bold uppercase text-xs border-b border-stone-100">
              <tr>
                <th className="p-4">Task</th>
                <th className="p-4">Type</th>
                <th className="p-4">Assignee</th>
                <th className="p-4">Status</th>
                <th className="p-4">Due Date</th>
                {isAdmin && <th className="p-4 w-12"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sortedTasks.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="p-8 text-center text-stone-400"
                  >
                    No tasks found.
                  </td>
                </tr>
              )}
              {sortedTasks.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-stone-50 transition-colors group"
                >
                  <td className="p-4 font-bold text-stone-800">{task.title}</td>

                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600">
                      {getTypeIcon(task.type)}
                      {getTypeLabel(task.type)}
                    </span>
                  </td>

                  <td className="p-4">
                    <span className="text-stone-600 font-medium">
                      {members.find((m) => m.discord_id === task.assigned_to)
                        ?.full_name ||
                        (task.type === "bounty" ? "Unclaimed" : "Unassigned")}
                    </span>
                  </td>

                  <td className="p-4">{getStatusBadge(task)}</td>

                  <td className="p-4 text-stone-400 font-mono text-xs">
                    {task.due_at
                      ? new Date(task.due_at).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                          hour12: true,
                        })
                      : "-"}
                  </td>

                  {isAdmin && (
                    <td className="p-4">
                      {onEdit && task.status !== "approved" && (
                        <button
                          onClick={() => onEdit(task)}
                          className="text-stone-300 hover:text-fiji-purple transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit Task"
                        >
                          <Pen className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
