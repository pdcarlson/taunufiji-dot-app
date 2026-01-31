/**
 * Schedule Service
 *
 * Handles recurring task schedule operations.
 * Uses repository pattern for data access.
 */

import { getContainer } from "@/lib/infrastructure/container";
import { HousingTask } from "@/lib/domain/entities/models";
import { CreateScheduleDTO } from "./types";
import { calculateNextInstance } from "@/lib/utils/scheduler";

export const ScheduleService = {
  /**
   * Create a new recurring schedule
   */
  async createSchedule(data: CreateScheduleDTO) {
    const { taskRepository } = getContainer();

    const schedule = await taskRepository.createSchedule({
      ...data,
      active: true,
      last_generated_at: new Date().toISOString(),
    });

    // Spawn First Instance
    const nextInstance = calculateNextInstance(
      schedule.recurrence_rule,
      new Date(),
      schedule.lead_time_hours || 24,
    );

    if (nextInstance) {
      const isLocked = nextInstance.unlockAt.getTime() > Date.now();
      const task = await taskRepository.create({
        title: schedule.title,
        description: schedule.description,
        points_value: schedule.points_value,
        type: "duty",
        schedule_id: schedule.$id,
        assigned_to: schedule.assigned_to,
        due_at: nextInstance.dueAt.toISOString(),
        unlock_at: nextInstance.unlockAt.toISOString(),
        status: isLocked ? "locked" : "open",
        notification_level: isLocked ? "none" : "unlocked",
      });

      // Emit Event only if visible
      if (!isLocked) {
        const { DomainEventBus } = await import("@/lib/infrastructure/events/dispatcher");
        const { TaskEvents } = await import("@/lib/domain/events");
        await DomainEventBus.publish(TaskEvents.TASK_CREATED, {
          taskId: task.$id,
          title: task.title,
          type: "duty" as const,
          assignedTo: task.assigned_to,
        });
      }
    }

    return schedule;
  },

  /**
   * Trigger the next instance of a schedule
   */
  async triggerNextInstance(scheduleId: string, previousTask: HousingTask) {
    const { taskRepository } = getContainer();

    const schedule = await taskRepository.findScheduleById(scheduleId);
    if (!schedule || !schedule.active) return;

    // Calculate Next based on completion or due date
    const prevDue = previousTask.completed_at
      ? new Date(previousTask.completed_at)
      : previousTask.due_at
        ? new Date(previousTask.due_at)
        : new Date();

    const nextInstance = calculateNextInstance(
      schedule.recurrence_rule,
      prevDue,
      schedule.lead_time_hours || 24,
    );

    if (!nextInstance) {
      console.warn(
        `Could not calculate next instance for schedule: ${schedule.$id}`,
      );
      return;
    }

    const isLocked = nextInstance.unlockAt.getTime() > Date.now();

    // Create Task
    await taskRepository.create({
      title: schedule.title,
      description: schedule.description,
      points_value: schedule.points_value,
      type: "duty",
      schedule_id: schedule.$id,
      assigned_to: schedule.assigned_to || previousTask.assigned_to,
      due_at: nextInstance.dueAt.toISOString(),
      unlock_at: nextInstance.unlockAt.toISOString(),
      status: isLocked ? "locked" : "open",
      notification_level: isLocked ? "none" : "unlocked",
    });

    // Update Schedule
    await taskRepository.updateSchedule(schedule.$id, {
      last_generated_at: new Date().toISOString(),
    });
  },

  /**
   * Get all schedules
   */
  async getSchedules() {
    const { taskRepository } = getContainer();
    return await taskRepository.findActiveSchedules();
  },

  /**
   * Get single schedule
   */
  async getSchedule(scheduleId: string) {
    const { taskRepository } = getContainer();
    return await taskRepository.findScheduleById(scheduleId);
  },

  /**
   * Update schedule
   */
  async updateSchedule(
    scheduleId: string,
    data: Partial<CreateScheduleDTO> & {
      active?: boolean;
      lead_time_hours?: number;
    },
  ) {
    const { taskRepository } = getContainer();
    return await taskRepository.updateSchedule(scheduleId, data);
  },
};
