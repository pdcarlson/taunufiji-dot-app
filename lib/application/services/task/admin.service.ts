/**
 * Admin Service
 *
 * Handles administrative task operations: create, approve, reject, reassign.
 * Uses repository pattern for data access.
 */

import { getContainer } from "@/lib/infrastructure/container";
import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import { TaskEvents } from "@/lib/domain/events";
import { CreateAssignmentDTO } from "./types";

export const AdminService = {
  /**
   * Create a new task (One-off or Recurring)
   * Emits: TASK_CREATED
   */
  async createTask(data: CreateAssignmentDTO) {
    const { taskRepository } = getContainer();

    const task = await taskRepository.create({
      ...data,
      status: data.status || "open",
      notification_level: data.status === "locked" ? "none" : "unlocked",
    });

    // Emit Event (Handlers will notify assignee if present)
    // Only if visible (open/pending/approved)
    const isVisible = task.status !== "locked";

    if (isVisible) {
      await DomainEventBus.publish(TaskEvents.TASK_CREATED, {
        taskId: task.$id,
        title: task.title,
        type: task.type as "duty" | "bounty" | "project" | "one_off",
        assignedTo: task.assigned_to,
      });
    }

    return task;
  },

  /**
   * Admin approves a task
   * Emits: TASK_APPROVED (Triggers PointsHandler & NotificationHandler)
   */
  async verifyTask(taskId: string, _verifierId: string, _rating: number = 5) {
    const { taskRepository } = getContainer();

    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    if (task.status !== "pending") {
      throw new Error("Task is not pending approval.");
    }

    // Update Task Status
    await taskRepository.update(taskId, {
      status: "approved",
      completed_at: new Date().toISOString(),
    });

    // Award Points & Notify (via Event)
    const awardAmount = task.points_value;

    await DomainEventBus.publish(TaskEvents.TASK_APPROVED, {
      taskId: task.$id,
      title: task.title,
      userId: task.assigned_to,
      points: awardAmount,
    });

    // Trigger Recurrence
    if (task.schedule_id) {
      const { ScheduleService } = await import("./schedule.service");
      try {
        await ScheduleService.triggerNextInstance(task.schedule_id, task);
      } catch (e) {
        console.error("Failed to trigger next instance", e);
      }
    }

    return true;
  },

  /**
   * Admin rejects a task
   * Emits: TASK_REJECTED
   */
  async rejectTask(taskId: string, reason: string) {
    const { taskRepository } = getContainer();

    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    await taskRepository.update(taskId, {
      status: "open",
      proof_s3_key: undefined,
    });

    await DomainEventBus.publish(TaskEvents.TASK_REJECTED, {
      taskId: task.$id,
      title: task.title,
      userId: task.assigned_to,
      reason,
    });

    return true;
  },

  /**
   * Update task details
   */
  async updateTask(taskId: string, data: Partial<CreateAssignmentDTO>) {
    const { taskRepository } = getContainer();
    return await taskRepository.update(taskId, data);
  },

  /**
   * Admin reassigns a task (or unassigns if null)
   * Emits: TASK_REASSIGNED
   */
  async adminReassign(taskId: string, newUserId: string | null) {
    const { taskRepository } = getContainer();

    const task = await taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    await taskRepository.update(taskId, {
      assigned_to: newUserId ?? undefined,
      status: newUserId ? "pending" : "open",
    });

    // If reassigned (not unassigned), emit event
    if (newUserId) {
      await DomainEventBus.publish(TaskEvents.TASK_REASSIGNED, {
        taskId: task.$id,
        title: task.title,
        newUserId: newUserId,
      });
    }

    return true;
  },

  /**
   * Delete a task
   */
  async deleteTask(taskId: string) {
    const { taskRepository } = getContainer();
    await taskRepository.delete(taskId);
  },
};
