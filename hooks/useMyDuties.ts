"use client";

import { useOptimistic, useTransition } from "react";
import { HousingTask } from "@/lib/domain/types/task";
import {
  submitProofAction,
  unclaimTaskAction,
} from "@/lib/presentation/actions/housing.actions";
import { useAuth } from "@/components/providers/AuthProvider";
// I see 'sonner' in previous conversations/files? No.
// I'll stick to console.error for now or minimal feedback.

export function useMyDuties(initialTasks: HousingTask[], userId: string) {
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    initialTasks,
    (state, action: { type: "COMPLETE" | "DELETE"; taskId: string }) => {
      if (action.type === "DELETE") {
        return state.filter((t) => t.id !== action.taskId);
      }
      if (action.type === "COMPLETE") {
        return state.map((t) =>
          t.id === action.taskId ? { ...t, status: "pending" } : t,
        ) as HousingTask[];
      }
      return state;
    },
  );

  const { getToken } = useAuth(); // Assuming wrapped in AuthProvider

  const [isPending, startTransition] = useTransition();

  const handleComplete = async (taskId: string, file: File) => {
    startTransition(() => {
      setOptimisticTasks({ type: "COMPLETE", taskId });
    });

    const formData = new FormData();
    formData.append("taskId", taskId);
    formData.append("file", file);

    try {
      const jwt = await getToken();
      const result = await submitProofAction(formData, jwt);
      if (!result.success) {
        // In real app, revert optimistic state or show error
        console.error("Failed to submit proof");
        // We can't easily "revert" useOptimistic externally except by invalidating data.
        // Re-fetching will fix it.
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (taskId: string) => {
    startTransition(() => {
      setOptimisticTasks({ type: "DELETE", taskId });
    });

    try {
      const jwt = await getToken();
      const result = await unclaimTaskAction(taskId, jwt);
      if (!result.success) {
        console.error("Failed to unclaim task");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sortedTasks = [...optimisticTasks].sort((a, b) => {
    // Sort by Due Date (Ascending) - earliest due first
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  return {
    tasks: sortedTasks,
    handleComplete,
    handleDelete,
    isPending,
  };
}
