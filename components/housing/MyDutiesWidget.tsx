"use client";

import { HousingTask } from "@/lib/domain/types/task";
import TaskCard from "./TaskCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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

  if (tasks.length === 0) {
    // Return null or empty state?
    // If we want it to be collapsible, maybe return nothing if no tasks?
    // But prompt says "render the 'My Duties' widget at the top".
    // It implies it should exist.
    // I'll render an empty state.
    return (
      <Card className="border-dashed border-stone-200 bg-stone-50/50">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-stone-500">
          <ClipboardList className="w-8 h-8 mb-3 opacity-20" />
          <p>No active duties assigned.</p>
        </CardContent>
      </Card>
    );
  }

  const { getToken } = useAuth(); // Assuming wrapped in AuthProvider

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList className="w-5 h-5 text-stone-400" />
        <h2 className="font-bebas text-2xl text-stone-700">My Duties</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            userId={userId}
            profileId={userId}
            userName="" // Not used in TaskCard logic really
            isAdmin={false}
            onRefresh={() => location.reload()} // Simple refresh for now as we lack a dedicated refresher
            getJWT={getToken}
          />
        ))}
      </div>
    </div>
  );
}
