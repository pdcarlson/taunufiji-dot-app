/**
 * Admin Service
 *
 * Handles administrative task operations: create, approve, reject, reassign.
 * Uses repository pattern for data access.
 */

import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { CreateAssignmentDTO } from "@/lib/domain/types/task";
import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import { TaskEvents } from "@/lib/domain/events";
import { ScheduleService } from "./schedule.service";

export class AdminService {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly scheduleService: ScheduleService,
  ) {}

  /**
   * Create a new task (One-off or Recurring)
   * Emits: TASK_CREATED
   */
  async createTask(data: CreateAssignmentDTO) {
    const task = await this.taskRepository.create({
      ...data,
      status: data.status || "open",
      notification_level: data.status === "locked" ? "none" : "unlocked",
    });

    // Emit Event (Handlers will notify assignee if present)
    // Only if visible (open/pending/approved)
    const isVisible = task.status !== "locked";

    if (isVisible) {
      await DomainEventBus.publish(TaskEvents.TASK_CREATED, {
        taskId: task.id,
        title: task.title,
        type: task.type as "duty" | "bounty" | "project" | "one_off",
        assignedTo: task.assigned_to,
      });
    }

    return task;
  }

  /**
   * Admin approves a task
   * Emits: TASK_APPROVED (Triggers PointsHandler & NotificationHandler)
   */
  async verifyTask(taskId: string, _verifierId: string, _rating: number = 5) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    if (task.status !== "pending") {
      throw new Error("Task is not pending approval.");
    }

    // Update Task Status
    await this.taskRepository.update(taskId, {
      status: "approved",
      completed_at: new Date().toISOString(),
    });

    // Award Points & Notify (via Event)
    const awardAmount = task.points_value;

    await DomainEventBus.publish(TaskEvents.TASK_APPROVED, {
      taskId: task.id,
      title: task.title,
      userId: task.assigned_to,
      points: awardAmount,
    });

    // Trigger Recurrence
    if (task.schedule_id) {
      try {
        await this.scheduleService.triggerNextInstance(task.schedule_id, task);
      } catch (e) {
        console.error("Failed to trigger next instance", e);
      }
    }

    return true;
  }

  /**
   * Admin rejects a task
   * Emits: TASK_REJECTED
   */
  async rejectTask(taskId: string, reason: string) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    // For bounties: unassign user so task returns to pool
    // For duties: keep assignee so they can resubmit
    const shouldUnassign = task.type === "bounty";

    await this.taskRepository.update(taskId, {
      status: shouldUnassign ? "open" : "rejected",
      proof_s3_key: null,
      assigned_to: shouldUnassign ? null : task.assigned_to,
    });

    await DomainEventBus.publish(TaskEvents.TASK_REJECTED, {
      taskId: task.id,
      title: task.title,
      userId: task.assigned_to,
      reason,
    });

    return true;
  }

  /**
   * Update task details
   */
  async updateTask(taskId: string, data: Partial<CreateAssignmentDTO>) {
    return await this.taskRepository.update(taskId, data);
  }

  /**
   * Admin reassigns a task (or unassigns if null)
   * Emits: TASK_REASSIGNED
   */
  async adminReassign(taskId: string, newUserId: string | null) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    await this.taskRepository.update(taskId, {
      assigned_to: newUserId ?? undefined,
      status: newUserId ? "pending" : "open",
    });

    // If reassigned (not unassigned), emit event
    if (newUserId) {
      await DomainEventBus.publish(TaskEvents.TASK_REASSIGNED, {
        taskId: task.id,
        title: task.title,
        newUserId: newUserId,
      });
    }

    return true;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string) {
    await this.taskRepository.delete(taskId);
  }
}
