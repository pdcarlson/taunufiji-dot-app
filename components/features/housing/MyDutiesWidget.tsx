"use client";

import { useState, useEffect } from "react";
import { HousingTask } from "@/lib/domain/entities";
import TaskCard from "./TaskCard";
import CollapsedDutyCard from "./cards/variants/CollapsedDutyCard";
import { Card, CardContent } from "@/components/ui/Card";
import { ClipboardList } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

interface MyDutiesWidgetProps {
  initialTasks: HousingTask[];
  userId: string;
  profileId?: string;
  variant?: "default" | "wide" | "minimal";
}

export default function MyDutiesWidget({
  initialTasks,
  userId,
  profileId,
  variant = "default",
}: MyDutiesWidgetProps) {
  const tasks = initialTasks;

  /* Accordion Logic */
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => {
    if (initialTasks.length > 0) {
      // Prefer pending/rejected tasks first, then the first one
      const priorityTask =
        initialTasks.find(
          (t) => t.status === "rejected" || t.status === "pending",
        ) || initialTasks[0];
      return priorityTask.id;
    }
    return null;
  });

  // Update active task if initialTasks changes effectively
  useEffect(() => {
    if (initialTasks.length > 0 && !activeTaskId) {
      // Logic to update if needed... but basic init is handled.
      // Actually, to match original intent of reacting to prop changes:
      const priorityTask =
        initialTasks.find(
          (t) => t.status === "rejected" || t.status === "pending",
        ) || initialTasks[0];

      // Only update if we don't have one? Or if the list fundamentally changed?
      // The safer way is to just let the user click. But if we MUST auto-select:
      if (priorityTask) {
        // eslint-disable-next-line react-hooks/exhaustive-deps -- we want to run this logic
        setActiveTaskId((prev) => prev || priorityTask.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- targeted updates
  }, [initialTasks]);

  const { getToken } = useAuth();

  // If no tasks, show empty state
  if (tasks.length === 0) {
    if (variant === "minimal") {
      // Minimal empty state (matching other housing sections)
      return (
        <div className="text-center py-8 bg-stone-50 rounded border border-dashed border-stone-200 text-stone-400 font-bold h-full flex items-center justify-center">
          No active duties assigned.
        </div>
      );
    }
    return (
      <Card className="border-dashed border-stone-200 bg-stone-50/50 h-full">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-stone-500 h-full">
          <ClipboardList className="w-8 h-8 mb-3 opacity-20" />
          <p>No active duties assigned.</p>
        </CardContent>
      </Card>
    );
  }

  const isMinimal = variant === "minimal";
  const containerClasses = isMinimal
    ? "h-full flex flex-col"
    : "bg-white rounded-xl shadow-sm border border-stone-200 p-5 h-full flex flex-col";

  return (
    <div className={containerClasses}>
      {isMinimal ? (
        <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-2">
          <h2 className="font-bebas text-2xl text-stone-700">My Duties</h2>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-100">
          <ClipboardList className="w-5 h-5 text-fiji-purple" />
          <h2 className="font-bebas text-2xl text-stone-700">My Duties</h2>
        </div>
      )}

      <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
        {tasks.map((task) => {
          if (variant === "wide") {
            return (
              <div
                key={task.id}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <TaskCard
                  task={task}
                  userId={userId}
                  profileId={profileId || userId}
                  userName=""
                  isAdmin={false}
                  getJWT={getToken}
                  variant="horizontal"
                />
              </div>
            );
          }

          const isActive = task.id === activeTaskId;

          return isActive ? (
            // EXPANDED CARD
            <div
              key={task.id}
              className="animate-in fade-in zoom-in-95 duration-200"
            >
              <TaskCard
                task={task}
                userId={userId}
                profileId={profileId || userId}
                userName=""
                isAdmin={false}
                getJWT={getToken}
                variant="square"
              />
            </div>
          ) : (
            // COLLAPSED CARD
            <CollapsedDutyCard
              key={task.id}
              task={task}
              onClick={() => setActiveTaskId(task.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
