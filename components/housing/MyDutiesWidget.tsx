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
}

export default function MyDutiesWidget({
  initialTasks,
  userId,
}: MyDutiesWidgetProps) {
  const tasks = initialTasks;

  /* Accordion Logic */
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Set initial active task
  useEffect(() => {
    if (initialTasks.length > 0 && !activeTaskId) {
      // Prefer pending/rejected tasks first, then the first one
      const priorityTask =
        initialTasks.find(
          (t) => t.status === "rejected" || t.status === "pending",
        ) || initialTasks[0];
      setActiveTaskId(priorityTask.id);
    }
  }, [initialTasks]);

  const { getToken } = useAuth();

  // If no tasks, show empty state
  if (tasks.length === 0) {
    return (
      <Card className="border-dashed border-stone-200 bg-stone-50/50">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-stone-500">
          <ClipboardList className="w-8 h-8 mb-3 opacity-20" />
          <p>No active duties assigned.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 relative z-10 w-full max-w-full">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList className="w-5 h-5 text-stone-400" />
        <h2 className="font-bebas text-2xl text-stone-700">My Duties</h2>
      </div>

      <div className="flex flex-col gap-3">
        {tasks.map((task) => {
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
                profileId={userId}
                userName=""
                isAdmin={false}
                getJWT={getToken}
              />
            </div>
          ) : (
            // COLLAPSED CARD
            <CollapsedDutyCard
              key={task.id}
              task={task}
              isActive={false}
              onClick={() => setActiveTaskId(task.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
