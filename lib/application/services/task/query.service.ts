/**
 * Query Service
 *
 * Handles task query operations: fetching tasks, listings, and user profiles.
 * Uses repository pattern for data access.
 */

import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { IUserRepository } from "@/lib/domain/ports/user.repository";
import { HousingTask } from "@/lib/domain/types/task";
import { User } from "@/lib/domain/types/user";
import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import { TaskEvents } from "@/lib/domain/events";

export class QueryService {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async getTask(taskId: string) {
    return await this.taskRepository.findById(taskId);
  }

  async getAllActiveTasks() {
    return await this.taskRepository.findMany({
      status: ["open", "pending", "locked", "rejected"],
      orderBy: "createdAt",
      orderDirection: "desc",
      limit: 100, // Reasonable limit for now
    });
  }

  async getOpenTasks() {
    // Fetch Open AND Locked tasks (to check for unlocking)
    const [openTasks, lockedTasks] = await Promise.all([
      this.taskRepository.findMany({
        status: "open",
        orderBy: "createdAt",
        orderDirection: "desc",
      }),
      this.taskRepository.findMany({
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
        await this.taskRepository.update(task.id, {
          status: "open",
          notification_level: "unlocked",
        });

        // Notify via domain event
        await DomainEventBus.publish(TaskEvents.TASK_UNLOCKED, {
          taskId: task.id,
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
  }

  async getPendingReviews() {
    return await this.taskRepository.findPending();
  }

  async getHistory(profileId: string) {
    return await this.taskRepository.findMany({
      assignedTo: profileId,
      status: "approved",
      orderBy: "createdAt",
      orderDirection: "desc",
    });
  }

  async getMembers(): Promise<User[]> {
    return await this.userRepository.findMany({
      limit: 100,
      orderBy: "createdAt",
      orderDirection: "asc",
    });
  }

  async getUserProfile(profileId: string) {
    try {
      return await this.userRepository.findByDiscordId(profileId);
    } catch {
      console.warn(`QueryService: User ${profileId} not found.`);
      return null;
    }
  }
}
