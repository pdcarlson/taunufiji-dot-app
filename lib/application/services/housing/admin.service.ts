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
import { RecurringMutationOptions } from "@/lib/domain/types/recurring";
import { logger } from "@/lib/utils/logger";

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
        assignedTo: task.assigned_to ?? undefined,
      });
    }

    return task;
  }

  /**
   * Admin approves a task
   * Emits: TASK_APPROVED (Triggers PointsHandler & NotificationHandler)
   */
  async verifyTask(
    taskId: string,
    _verifierId: string,
    overridePoints?: number,
  ) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    if (task.status !== "pending") {
      throw new Error("Task is not pending approval.");
    }
    const assignedUserId = task.assigned_to;
    if (!assignedUserId) {
      throw new Error("Cannot approve task without an assignee.");
    }
    const originalPointsValue = task.points_value;

    // Update Task Status & potentially Points
    const updates: Partial<CreateAssignmentDTO> = {
      status: "approved",
      completed_at: new Date().toISOString(),
    };

    if (overridePoints !== undefined) {
      updates.points_value = overridePoints;
    }

    await this.taskRepository.update(taskId, updates);

    const updatedTask = { ...task, ...updates };

    // Award Points & Notify (via Event)
    // Use override if provided, otherwise original
    const awardAmount =
      overridePoints !== undefined ? overridePoints : task.points_value;
    try {
      await DomainEventBus.publish(TaskEvents.TASK_APPROVED, {
        taskId: task.id,
        title: task.title,
        userId: assignedUserId,
        points: awardAmount,
      });
    } catch (error) {
      const originalError =
        error instanceof Error ? error : new Error(String(error));
      this.taskRepository
        .update(taskId, {
          status: "pending",
          completed_at: null,
          points_value: originalPointsValue,
        })
        .catch((rollbackError) => {
          logger.error(
            `[AdminService.verifyTask] Rollback failed for taskId=${taskId}`,
            rollbackError,
          );
        });
      throw new Error(
        `Failed to complete approval process: ${originalError.message}`,
      );
    }

    // Trigger Recurrence (pass updated task so scheduler sees completed_at)
    if (task.schedule_id) {
      try {
        await this.scheduleService.triggerNextInstance(
          task.schedule_id,
          updatedTask,
        );
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

    // For ad-hoc tasks: delete entirely on rejection
    if (task.type === "ad_hoc") {
      if (task.assigned_to) {
        await DomainEventBus.publish(TaskEvents.TASK_REJECTED, {
          taskId: task.id,
          title: task.title,
          userId: task.assigned_to,
          reason,
        });
      }

      await this.taskRepository.delete(taskId);
      return true;
    }

    // For bounties: unassign user so task returns to pool
    // For duties: keep assignee so they can resubmit
    const shouldUnassign = task.type === "bounty";

    await this.taskRepository.update(taskId, {
      status: shouldUnassign ? "open" : "rejected",
      proof_s3_key: null,
      assigned_to: shouldUnassign ? null : task.assigned_to,
    });
    try {
      if (task.assigned_to) {
        await DomainEventBus.publish(TaskEvents.TASK_REJECTED, {
          taskId: task.id,
          title: task.title,
          userId: task.assigned_to,
          reason,
        });
      }
    } catch (error) {
      const originalError =
        error instanceof Error ? error : new Error(String(error));
      this.taskRepository
        .update(taskId, {
          status: task.status,
          proof_s3_key: task.proof_s3_key,
          assigned_to: task.assigned_to,
        })
        .catch((rollbackError) => {
          logger.error(
            `[AdminService.rejectTask] Rollback failed for taskId=${taskId}`,
            rollbackError,
          );
        });
      throw originalError;
    }

    return true;
  }

  /**
   * Update task details
   */
  async updateTask(
    taskId: string,
    data: Partial<CreateAssignmentDTO>,
    recurringOptions?: RecurringMutationOptions,
  ) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    if (
      !task.schedule_id ||
      !recurringOptions ||
      recurringOptions.scope === "this_instance"
    ) {
      return await this.taskRepository.update(taskId, data);
    }

    if (recurringOptions.scope === "entire_series") {
      return await this.scheduleService.updateTaskEntireSeries(
        task,
        data,
        undefined,
      );
    }

    const effectiveFromDueAt =
      recurringOptions.effectiveFromDueAt ?? task.due_at ?? undefined;
    if (!effectiveFromDueAt) {
      throw new Error(
        "effectiveFromDueAt or task.due_at required for scoped recurring updates",
      );
    }

    return await this.scheduleService.updateTaskThisAndFuture(
      task,
      data,
      effectiveFromDueAt,
    );
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
  async deleteTask(
    taskId: string,
    recurringOptions?: RecurringMutationOptions,
  ) {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    if (
      !task.schedule_id ||
      !recurringOptions ||
      recurringOptions.scope === "this_instance"
    ) {
      await this.taskRepository.delete(taskId);
      return;
    }

    if (recurringOptions.scope === "entire_series") {
      await this.scheduleService.deleteTaskEntireSeries(task, undefined);
      return;
    }

    const effectiveFromDueAt =
      recurringOptions.effectiveFromDueAt ?? task.due_at ?? undefined;
    if (!effectiveFromDueAt) {
      throw new Error(
        "effectiveFromDueAt or task.due_at required for scoped recurring deletes",
      );
    }

    await this.scheduleService.deleteTaskThisAndFuture(
      task,
      effectiveFromDueAt,
    );
  }
}
