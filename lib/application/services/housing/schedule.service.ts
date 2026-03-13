/**
 * Schedule Service
 *
 * Handles recurring task schedule operations.
 * Uses repository pattern for data access.
 */

import { ITaskRepository } from "@/lib/domain/ports/task.repository";
import { CreateAssignmentDTO, HousingTask } from "@/lib/domain/types/task";
import { CreateScheduleDTO } from "@/lib/domain/types/schedule";
import { calculateNextInstance } from "@/lib/utils/scheduler";
import { DomainEventBus } from "@/lib/infrastructure/events/dispatcher";
import { TaskEvents } from "@/lib/domain/events";
import { RecurringMutationOptions } from "@/lib/domain/types/recurring";

const NON_FINAL_STATUSES: HousingTask["status"][] = [
  "open",
  "pending",
  "locked",
  "rejected",
];

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
        schedule_id: schedule.id,
        assigned_to: schedule.assigned_to,
        due_at: nextInstance.dueAt.toISOString(),
        unlock_at: nextInstance.unlockAt.toISOString(),
        status: isLocked ? "locked" : "open",
        notification_level: isLocked ? "none" : "unlocked",
      });

      // Emit Event only if visible
      if (!isLocked) {
        await DomainEventBus.publish(TaskEvents.TASK_CREATED, {
          taskId: task.id,
          title: task.title,
          type: "duty" as const,
          assignedTo: task.assigned_to ?? undefined,
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
        `Could not calculate next instance for schedule: ${schedule.id}`,
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
      schedule_id: schedule.id,
      assigned_to: schedule.assigned_to || previousTask.assigned_to,
      due_at: nextInstance.dueAt.toISOString(),
      unlock_at: nextInstance.unlockAt.toISOString(),
      status: isLocked ? "locked" : "open",
      notification_level: isLocked ? "none" : "unlocked",
    });

    // Update Schedule
    await this.taskRepository.updateSchedule(schedule.id, {
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
  async updateSchedule(
    scheduleId: string,
    data: Partial<CreateScheduleDTO>,
    recurringOptions?: RecurringMutationOptions,
  ) {
    const updatedSchedule = await this.taskRepository.updateSchedule(scheduleId, data);

    if (
      recurringOptions &&
      recurringOptions.scope !== "this_instance" &&
      recurringOptions.effectiveFromDueAt &&
      data.lead_time_hours !== undefined
    ) {
      const seriesTasks = await this.taskRepository.findMany({
        scheduleId,
        status: NON_FINAL_STATUSES,
        limit: 500,
      });

      const now = new Date();
      const effectiveFrom = new Date(recurringOptions.effectiveFromDueAt);

      await Promise.all(
        seriesTasks
          .filter((task) => {
            if (task.id === undefined || !task.due_at) {
              return false;
            }
            return new Date(task.due_at) >= effectiveFrom;
          })
          .map((task) => {
            if (!task.due_at) {
              return Promise.resolve();
            }

            const dueAt = new Date(task.due_at);
            const unlockAt = new Date(
              dueAt.getTime() - data.lead_time_hours! * 60 * 60 * 1000,
            );
            const shouldBeLocked = unlockAt > now;
            const shouldUpdateStatus =
              task.status === "locked" || task.status === "open";

            return this.taskRepository.update(task.id, {
              unlock_at: unlockAt.toISOString(),
              status: shouldUpdateStatus
                ? shouldBeLocked
                  ? "locked"
                  : "open"
                : task.status,
              notification_level: shouldUpdateStatus
                ? shouldBeLocked
                  ? "none"
                  : "unlocked"
                : task.notification_level,
            });
          }),
      );
    }

    return updatedSchedule;
  }

  async updateTaskThisAndFuture(
    task: HousingTask,
    data: Partial<CreateAssignmentDTO>,
    effectiveFromDueAt: string,
  ) {
    if (!task.schedule_id) {
      return await this.taskRepository.update(task.id, data);
    }

    await this.taskRepository.update(task.id, data);

    const futureTaskPatch = this.toFutureTaskPatch(data);
    if (Object.keys(futureTaskPatch).length > 0) {
      const effectiveFrom = new Date(effectiveFromDueAt);
      const seriesTasks = await this.taskRepository.findMany({
        scheduleId: task.schedule_id,
        status: NON_FINAL_STATUSES,
        limit: 500,
      });

      await Promise.all(
        seriesTasks
          .filter((seriesTask) => {
            if (seriesTask.id === task.id || !seriesTask.due_at) {
              return false;
            }
            return new Date(seriesTask.due_at) >= effectiveFrom;
          })
          .map((seriesTask) =>
            this.taskRepository.update(seriesTask.id, futureTaskPatch),
          ),
      );
    }

    const schedulePatch = this.toSchedulePatch(data);
    if (Object.keys(schedulePatch).length > 0) {
      await this.taskRepository.updateSchedule(task.schedule_id, {
        ...schedulePatch,
        last_generated_at: new Date().toISOString(),
      });
    }

    return await this.taskRepository.findById(task.id);
  }

  async updateTaskEntireSeries(
    task: HousingTask,
    data: Partial<CreateAssignmentDTO>,
    effectiveFromDueAt: string,
  ) {
    void effectiveFromDueAt;
    if (!task.schedule_id) {
      return await this.taskRepository.update(task.id, data);
    }

    const seriesTasks = await this.taskRepository.findMany({
      scheduleId: task.schedule_id,
      status: NON_FINAL_STATUSES,
      limit: 500,
    });

    await this.taskRepository.update(task.id, data);

    const futureTaskPatch = this.toFutureTaskPatch(data);
    if (Object.keys(futureTaskPatch).length > 0) {
      await Promise.all(
        seriesTasks
          .filter((seriesTask) => seriesTask.id !== task.id)
          .map((seriesTask) =>
            this.taskRepository.update(seriesTask.id, futureTaskPatch),
          ),
      );
    }

    const schedulePatch = this.toSchedulePatch(data);
    if (Object.keys(schedulePatch).length > 0) {
      await this.taskRepository.updateSchedule(task.schedule_id, {
        ...schedulePatch,
        last_generated_at: new Date().toISOString(),
      });
    }

    return await this.taskRepository.findById(task.id);
  }

  async deleteTaskThisAndFuture(task: HousingTask, effectiveFromDueAt: string) {
    if (!task.schedule_id) {
      await this.taskRepository.delete(task.id);
      return;
    }

    const effectiveFrom = new Date(effectiveFromDueAt);
    const seriesTasks = await this.taskRepository.findMany({
      scheduleId: task.schedule_id,
      status: NON_FINAL_STATUSES,
      limit: 500,
    });

    await Promise.all(
      seriesTasks
        .filter((seriesTask) => {
          if (seriesTask.id === task.id) {
            return true;
          }
          if (!seriesTask.due_at) {
            return false;
          }
          return new Date(seriesTask.due_at) >= effectiveFrom;
        })
        .map((seriesTask) => this.taskRepository.delete(seriesTask.id)),
    );

    await this.taskRepository.updateSchedule(task.schedule_id, {
      active: false,
      last_generated_at: new Date().toISOString(),
    });
  }

  async deleteTaskEntireSeries(task: HousingTask, effectiveFromDueAt: string) {
    void effectiveFromDueAt;
    if (!task.schedule_id) {
      await this.taskRepository.delete(task.id);
      return;
    }

    const seriesTasks = await this.taskRepository.findMany({
      scheduleId: task.schedule_id,
      status: NON_FINAL_STATUSES,
      limit: 500,
    });

    await Promise.all(
      seriesTasks.map((seriesTask) => this.taskRepository.delete(seriesTask.id)),
    );

    await this.taskRepository.updateSchedule(task.schedule_id, {
      active: false,
      last_generated_at: new Date().toISOString(),
    });
  }

  private toSchedulePatch(
    data: Partial<CreateAssignmentDTO>,
  ): Partial<CreateScheduleDTO> {
    const patch: Partial<CreateScheduleDTO> = {};

    if (data.title !== undefined) {
      patch.title = data.title;
    }
    if (data.description !== undefined) {
      patch.description = data.description;
    }
    if (data.assigned_to !== undefined) {
      patch.assigned_to = data.assigned_to;
    }
    if (data.points_value !== undefined) {
      patch.points_value = data.points_value;
    }

    return patch;
  }

  private toFutureTaskPatch(
    data: Partial<CreateAssignmentDTO>,
  ): Partial<CreateAssignmentDTO> {
    const patch: Partial<CreateAssignmentDTO> = {};

    if (data.title !== undefined) {
      patch.title = data.title;
    }
    if (data.description !== undefined) {
      patch.description = data.description;
    }
    if (data.assigned_to !== undefined) {
      patch.assigned_to = data.assigned_to;
    }
    if (data.points_value !== undefined) {
      patch.points_value = data.points_value;
    }

    return patch;
  }
}
