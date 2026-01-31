/**
 * Query Service
 *
 * Handles task query operations: fetching tasks, listings, and user profiles.
 * Uses repository pattern for data access.
 */

import { getContainer } from "@/lib/infrastructure/container";
import { HousingTask, Member } from "@/lib/domain/entities/models";

export const QueryService = {
  async getTask(taskId: string) {
    const { taskRepository } = getContainer();
    return await taskRepository.findById(taskId);
  },

  async getOpenTasks() {
    const { taskRepository } = getContainer();

    // Fetch Open AND Locked tasks (to check for unlocking)
    const [openTasks, lockedTasks] = await Promise.all([
      taskRepository.findMany({
        status: "open",
        orderBy: "createdAt",
        orderDirection: "desc",
      }),
      taskRepository.findMany({
        status: "locked",
        orderBy: "createdAt",
        orderDirection: "desc",
      }),
    ]);

    const allDocs = [...openTasks, ...lockedTasks];
    const now = new Date();
    const cleanRows: HousingTask[] = [];

    for (const task of allDocs) {
      // Unlock Check
      if (
        task.status === "locked" &&
        task.unlock_at &&
        now >= new Date(task.unlock_at)
      ) {
        await taskRepository.update(task.$id, {
          status: "open",
          notification_level: "unlocked",
        });

        // Notify via domain event
        const { DomainEventBus } = await import("@/lib/infrastructure/events/dispatcher");
        const { TaskEvents } = await import("@/lib/domain/events");
        await DomainEventBus.publish(TaskEvents.TASK_UNLOCKED, {
          taskId: task.$id,
          title: task.title,
          userId: task.assigned_to || "",
        });

        task.status = "open";
        cleanRows.push(task);
        continue;
      }

      // Hide if still locked properly
      if (task.status === "locked") {
        continue;
      }

      cleanRows.push(task);
    }

    return cleanRows;
  },

  async getPendingReviews() {
    const { taskRepository } = getContainer();
    return await taskRepository.findPending();
  },

  async getHistory(profileId: string) {
    const { taskRepository } = getContainer();
    return await taskRepository.findMany({
      assignedTo: profileId,
      status: "approved",
      orderBy: "createdAt",
      orderDirection: "desc",
    });
  },

  async getMembers(): Promise<Member[]> {
    const { userRepository } = getContainer();
    return await userRepository.findMany({
      limit: 100,
      orderBy: "createdAt",
      orderDirection: "asc",
    });
  },

  async getUserProfile(profileId: string) {
    const { userRepository } = getContainer();
    try {
      return await userRepository.findByDiscordId(profileId);
    } catch {
      console.warn(`QueryService: User ${profileId} not found.`);
      return null;
    }
  },
};
