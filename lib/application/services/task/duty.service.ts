/**
 * Duty Service
 *
 * Handles task claiming, submission, and unclaiming operations.
 * Uses repository pattern for data access.
 */

import { getContainer } from "@/lib/infrastructure/container";
import { HousingTask } from "@/lib/domain/entities";
import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import { TaskEvents } from "@/lib/domain/events";

export const DutyService = {
  /**
   * Claim a task
   * Emits: TASK_CLAIMED
   */
  async claimTask(taskId: string, profileId: string) {
    const { taskRepository } = getContainer();

    // 1. Fetch to check status and execution limit
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    if (task.status !== "open") {
      throw new Error("Task is not available to be claimed.");
    }

    const updates: Partial<HousingTask> = {
      status: "pending",
      assigned_to: profileId,
    };

    // 2. Set Deadline if limit exists
    if (task.execution_limit && task.execution_limit > 0) {
      const due = new Date();
      due.setDate(due.getDate() + task.execution_limit);
      updates.due_at = due.toISOString();
    }

    const result = await taskRepository.update(taskId, updates);

    // Emit Event
    await DomainEventBus.publish(TaskEvents.TASK_CLAIMED, {
      taskId: task.$id,
      title: task.title,
      userId: profileId,
    });

    return result;
  },

  /**
   * Submit proof for a task
   * Emits: TASK_SUBMITTED
   */
  async submitProof(taskId: string, profileId: string, s3Key: string) {
    const { taskRepository } = getContainer();

    // 1. Verify Ownership
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    if (task.assigned_to !== profileId) {
      throw new Error("You are not assigned to this task.");
    }

    // 1b. Check Expiry
    if (task.due_at && new Date() > new Date(task.due_at)) {
      throw new Error("Task is expired. You cannot submit late.");
    }

    const result = await taskRepository.update(taskId, {
      status: "pending",
      proof_s3_key: s3Key,
    });

    // Emit Event
    await DomainEventBus.publish(TaskEvents.TASK_SUBMITTED, {
      taskId: task.$id,
      title: task.title,
      userId: profileId,
    });

    return result;
  },

  /**
   * Unclaim a task (release it back to pool)
   * Emits: TASK_UNASSIGNED
   */
  async unclaimTask(taskId: string, profileId: string) {
    const { taskRepository } = getContainer();

    // Fetch to verify ownership
    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    if (task.assigned_to !== profileId) {
      throw new Error("You are not assigned to this task.");
    }

    const result = await taskRepository.update(taskId, {
      status: "open",
      assigned_to: undefined,
      due_at: undefined,
    });

    // Emit Event
    await DomainEventBus.publish(TaskEvents.TASK_UNASSIGNED, {
      taskId: task.$id,
      title: task.title,
      userId: profileId,
    });

    return result;
  },

  /**
   * Get tasks assigned to current user, with lazy evaluation for expiry/recurrence.
   */
  async getMyTasks(userId: string) {
    const { taskRepository } = getContainer();

    const allAssigned = await taskRepository.findByAssignee(userId);
    const now = new Date();
    const filtered: HousingTask[] = [];

    // Lazy Logic: Now handled by MaintenanceService. Just filter the view.
    for (const task of allAssigned) {
      if (task.status === "approved" || task.status === "expired") {
        continue;
      }

      // If it looks expired but isn't updated yet, we hide it or show it as is.
      // Ideally Maintenance runs BEFORE this, so the data is fresh.

      filtered.push(task);
    }

    return { documents: filtered, total: filtered.length };
  },
};
