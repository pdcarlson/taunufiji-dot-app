"use client";

import { useState } from "react";
import {
  createTaskAction,
  reassignTaskAction,
} from "@/lib/actions/housing.actions";
import { account } from "@/lib/client/appwrite";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Coins,
  Briefcase,
} from "lucide-react";
import toast from "react-hot-toast";

import { HousingTask, Member } from "@/lib/types/models";

// ...

interface DutyRosterProps {
  tasks: HousingTask[];
  members: Member[]; // Need to fetch members
  isAdmin: boolean;
  userId: string;
  onRefresh: () => void;
  jwt?: string;
}

export default function DutyRoster({
  tasks,
  members,
  isAdmin,
  userId,
  onRefresh,
}: DutyRosterProps) {
  const recurring = tasks.filter((t) => t.type === "duty");

  // REASSIGN HANDLER
  const handleReassign = async (taskId: string, newId: string) => {
    // const assignee = members.find((m) => m.user_id === newId);
    // Needed for name.
    const assigneeName =
      members.find((m) => m.$id === newId)?.full_name || "Unknown";

    try {
      const { jwt } = await account.createJWT();
      await reassignTaskAction(taskId, newId || "", assigneeName, jwt);
      toast.success("Roster Updated");
      onRefresh();
    } catch {
      toast.error("Update Failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* 2. MASTER ROSTER TABLE */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-stone-100 bg-stone-50">
          <h2 className="font-bebas text-2xl text-stone-700">
            Master Duty Roster
          </h2>
          <p className="text-stone-500 text-sm">
            Official list of recurring responsibilities.
          </p>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-white text-stone-400 font-bold uppercase text-xs border-b border-stone-100">
            <tr>
              <th className="p-4">Duty</th>
              <th className="p-4">Assignee</th>
              <th className="p-4">Status</th>
              <th className="p-4">Deadline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {recurring.map((task) => {
              const isOverdue =
                task.due_at &&
                new Date() > new Date(task.due_at) &&
                task.status === "pending";
              const isDone =
                task.status === "approved" ||
                (task.status === "pending" && task.unlock_at);

              return (
                <tr
                  key={task.$id}
                  className="hover:bg-stone-50 transition-colors"
                >
                  <td className="p-4 font-bold text-stone-800">{task.title}</td>

                  {/* ASSIGNEE COLUMN */}
                  <td className="p-4">
                    {isAdmin ? (
                      <select
                        className="bg-transparent border-b border-dashed border-stone-300 focus:border-fiji-purple outline-none py-1 w-full max-w-[150px] text-stone-700 font-medium"
                        value={task.assigned_to || ""}
                        onChange={(e) =>
                          handleReassign(task.$id, e.target.value)
                        }
                      >
                        <option value="">-- Unassigned --</option>
                        {members.map((m) => (
                          <option key={m.$id} value={m.$id}>
                            {m.full_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-stone-600 font-medium">
                        {members.find((m) => m.$id === task.assigned_to)
                          ?.full_name || "Unassigned"}
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    {isDone ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-bold text-xs">
                        <CheckCircle className="w-3 h-3" /> Done
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 text-red-600 font-bold text-xs">
                        <AlertCircle className="w-3 h-3" /> Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-stone-500 font-bold text-xs">
                        <Clock className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-stone-400 font-mono text-xs">
                    {task.due_at
                      ? new Date(task.due_at).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
