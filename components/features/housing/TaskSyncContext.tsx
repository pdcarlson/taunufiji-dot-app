"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { HousingTask } from "@/lib/domain/entities";

/**
 * Called after a card mutates a task.
 * `updated` is the row the server returned, or `null` when the change is not a
 * simple replacement (the caller should reload).
 */
export type TaskChangedHandler = (
  taskId: string,
  updated: HousingTask | null,
) => void;

const TaskSyncContext = createContext<TaskChangedHandler | null>(null);

/**
 * Lets the page that owns the task list hear about mutations made deep inside cards.
 * Housing pages keep tasks in client state, so `router.refresh()` alone never
 * reached them and cards kept showing the pre-submit buttons.
 */
export function TaskSyncProvider({
  onTaskChanged,
  children,
}: {
  onTaskChanged: TaskChangedHandler;
  children: ReactNode;
}) {
  return (
    <TaskSyncContext.Provider value={onTaskChanged}>
      {children}
    </TaskSyncContext.Provider>
  );
}

/**
 * Returns the handler cards call after a successful claim, unclaim, or submit.
 * Falls back to a router refresh when no provider is mounted.
 */
export function useTaskChanged(): TaskChangedHandler {
  const handler = useContext(TaskSyncContext);
  const router = useRouter();
  return useCallback<TaskChangedHandler>(
    (taskId, updated) => {
      if (handler) {
        handler(taskId, updated);
      } else {
        router.refresh();
      }
    },
    [handler, router],
  );
}

/**
 * Replaces `taskId` in `tasks` with `updated`, keeping order.
 * When `keep` rejects the updated row (e.g. it is no longer assigned to the viewer), it is dropped.
 */
export function applyTaskChange(
  tasks: HousingTask[],
  taskId: string,
  updated: HousingTask | null,
  keep: (task: HousingTask) => boolean = () => true,
): HousingTask[] {
  if (!updated) return tasks;
  return tasks.flatMap((t) => {
    if (t.id !== taskId) return [t];
    return keep(updated) ? [updated] : [];
  });
}
