/**
 * Schedule Service
 *
 * Handles recurring task schedule operations.
 * Uses repository pattern for data access.
 */

import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { HousingTask } from "@/lib/domain/types/task";
import { CreateScheduleDTO } from "@/lib/domain/types/schedule";
import { calculateNextInstance } from "@/lib/utils/scheduler";
import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import { TaskEvents } from "@/lib/domain/events";

export class ScheduleService {
  constructor(private readonly taskRepository: ITaskRepository) {}

  /**
   * Create a new recurring schedule
   */
  async createSchedule(data: CreateScheduleDTO) {
    const schedule = await this.taskRepository.createSchedule({
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
      const task = await this.taskRepository.create({
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
        await DomainEventBus.publish(TaskEvents.TASK_CREATED, {
          taskId: task.$id,
          title: task.title,
          type: "duty" as const,
          assignedTo: task.assigned_to,
        });
      }
    }

    return schedule;
  }

  /**
   * Trigger the next instance of a schedule
   */
  async triggerNextInstance(scheduleId: string, previousTask: HousingTask) {
    const schedule = await this.taskRepository.findScheduleById(scheduleId);
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
    await this.taskRepository.create({
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
    await this.taskRepository.updateSchedule(schedule.$id, {
      last_generated_at: new Date().toISOString(),
    });
  }

  /**
   * Get all schedules
   */
  async getSchedules() {
    return await this.taskRepository.findActiveSchedules();
  }

  /**
   * Get single schedule
   */
  async getSchedule(scheduleId: string) {
    return await this.taskRepository.findScheduleById(scheduleId);
  }

  /**
   * Update schedule
   */
  async updateSchedule(scheduleId: string, data: Partial<CreateScheduleDTO>) {
    return await this.taskRepository.updateSchedule(scheduleId, data);
  }
}
