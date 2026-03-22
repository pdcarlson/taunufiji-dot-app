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

const BATCH_SIZE = 500;

export class ScheduleService {
  constructor(private readonly taskRepository: ITaskRepository) {}

  private async findAllNonFinalByScheduleId(
    scheduleId: string,
  ): Promise<HousingTask[]> {
    const all: HousingTask[] = [];
    let offset = 0;
    let batch: HousingTask[];
    do {
      batch = await this.taskRepository.findMany({
        scheduleId,
        status: NON_FINAL_STATUSES,
        limit: BATCH_SIZE,
        offset,
      });
      all.push(...batch);
      offset += BATCH_SIZE;
    } while (batch.length === BATCH_SIZE);
    return all;
  }

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
      assigned_to:
        schedule.assigned_to === undefined
          ? previousTask.assigned_to
          : schedule.assigned_to,
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
    const scope = recurringOptions?.scope;
    const shouldRecalculateExistingTasks =
      data.lead_time_hours !== undefined &&
      recurringOptions !== undefined &&
      scope !== "this_instance" &&
      (scope === "entire_series" ||
        (scope === "this_and_future" && !!recurringOptions.effectiveFromDueAt));

    if (!shouldRecalculateExistingTasks) {
      return await this.taskRepository.updateSchedule(scheduleId, data);
    }

    const previousSchedule =
      await this.taskRepository.findScheduleById(scheduleId);
    const seriesTasks = await this.findAllNonFinalByScheduleId(scheduleId);
    const now = new Date();
    const effectiveFrom = recurringOptions.effectiveFromDueAt
      ? new Date(recurringOptions.effectiveFromDueAt)
      : null;

    const toUpdate = seriesTasks.filter((task) => {
      if (task.id === undefined || !task.due_at) {
        return false;
      }
      if (scope === "entire_series") {
        return true;
      }
      if (!effectiveFrom) {
        return false;
      }
      return new Date(task.due_at) >= effectiveFrom;
    });

    const taskRollbackSnapshots = toUpdate.map((task) => ({
      id: task.id,
      unlock_at: task.unlock_at,
      status: task.status,
      notification_level: task.notification_level,
    }));

    try {
      const updatedSchedule = await this.taskRepository.updateSchedule(
        scheduleId,
        data,
      );

      const updateResults = await Promise.allSettled(
        toUpdate.map((task) => {
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
      const updateFailure = updateResults.find(
        (result) => result.status === "rejected",
      );
      if (updateFailure && updateFailure.status === "rejected") {
        throw updateFailure.reason;
      }

      return updatedSchedule;
    } catch (error) {
      await Promise.all(
        taskRollbackSnapshots.map((task) =>
          this.taskRepository.update(task.id, {
            unlock_at: task.unlock_at,
            status: task.status,
            notification_level: task.notification_level,
          }),
        ),
      ).catch(() => undefined);

      if (previousSchedule) {
        const scheduleRollbackPatch: Partial<CreateScheduleDTO> = {};
        if (data.title !== undefined) {
          scheduleRollbackPatch.title = previousSchedule.title;
        }
        if (data.description !== undefined) {
          scheduleRollbackPatch.description = previousSchedule.description;
        }
        if (data.recurrence_rule !== undefined) {
          scheduleRollbackPatch.recurrence_rule =
            previousSchedule.recurrence_rule;
        }
        if (data.assigned_to !== undefined) {
          scheduleRollbackPatch.assigned_to = previousSchedule.assigned_to;
        }
        if (data.points_value !== undefined) {
          scheduleRollbackPatch.points_value = previousSchedule.points_value;
        }
        if (data.active !== undefined) {
          scheduleRollbackPatch.active = previousSchedule.active;
        }
        if (data.last_generated_at !== undefined) {
          scheduleRollbackPatch.last_generated_at =
            previousSchedule.last_generated_at;
        }
        if (data.lead_time_hours !== undefined) {
          scheduleRollbackPatch.lead_time_hours =
            previousSchedule.lead_time_hours;
        }
        if (Object.keys(scheduleRollbackPatch).length > 0) {
          await this.taskRepository
            .updateSchedule(scheduleId, scheduleRollbackPatch)
            .catch(() => undefined);
        }
      }

      throw error;
    }
  }

  /**
   * For recurring edits with schedule-backed fields, patches the schedule document so the next
   * generated instance (cron healing or `triggerNextInstance`) does not revert title/points/assignee.
   */
  async updateTaskThisAndFuture(
    task: HousingTask,
    data: Partial<CreateAssignmentDTO>,
    effectiveFromDueAt: string,
  ) {
    if (!task.schedule_id) {
      return await this.taskRepository.update(task.id, data);
    }
    const futureTaskPatch = this.toFutureTaskPatch(data);
    const schedulePatch = this.toSchedulePatch(data);
    const effectiveFrom = new Date(effectiveFromDueAt);
    const seriesTasks =
      Object.keys(futureTaskPatch).length > 0
        ? await this.findAllNonFinalByScheduleId(task.schedule_id)
        : [];
    const futureTargets = seriesTasks.filter((seriesTask) => {
      if (seriesTask.id === task.id || !seriesTask.due_at) {
        return false;
      }
      return new Date(seriesTask.due_at) >= effectiveFrom;
    });
    const previousSchedule =
      Object.keys(schedulePatch).length > 0
        ? await this.taskRepository.findScheduleById(task.schedule_id)
        : null;

    try {
      await this.taskRepository.update(task.id, data);

      if (Object.keys(futureTaskPatch).length > 0) {
        const updateResults = await Promise.allSettled(
          futureTargets.map((seriesTask) =>
            this.taskRepository.update(seriesTask.id, futureTaskPatch),
          ),
        );
        const updateFailure = updateResults.find(
          (result) => result.status === "rejected",
        );
        if (updateFailure && updateFailure.status === "rejected") {
          throw updateFailure.reason;
        }
      }

      if (Object.keys(schedulePatch).length > 0) {
        await this.taskRepository.updateSchedule(task.schedule_id, {
          ...schedulePatch,
          last_generated_at: new Date().toISOString(),
        });
      }

      return await this.taskRepository.findById(task.id);
    } catch (error) {
      if (Object.keys(futureTaskPatch).length > 0) {
        await Promise.allSettled(
          futureTargets.map((seriesTask) => {
            const rollbackPatch: Partial<CreateAssignmentDTO> = {};
            if (futureTaskPatch.title !== undefined) {
              rollbackPatch.title = seriesTask.title;
            }
            if (futureTaskPatch.description !== undefined) {
              rollbackPatch.description = seriesTask.description;
            }
            if (futureTaskPatch.assigned_to !== undefined) {
              rollbackPatch.assigned_to = seriesTask.assigned_to;
            }
            if (futureTaskPatch.points_value !== undefined) {
              rollbackPatch.points_value = seriesTask.points_value;
            }
            return Object.keys(rollbackPatch).length > 0
              ? this.taskRepository.update(seriesTask.id, rollbackPatch)
              : Promise.resolve();
          }),
        );
      }

      const currentRollbackPatch: Partial<CreateAssignmentDTO> = {};
      if (data.title !== undefined) {
        currentRollbackPatch.title = task.title;
      }
      if (data.description !== undefined) {
        currentRollbackPatch.description = task.description;
      }
      if (data.status !== undefined) {
        currentRollbackPatch.status = task.status;
      }
      if (data.type !== undefined) {
        currentRollbackPatch.type = task.type;
      }
      if (data.points_value !== undefined) {
        currentRollbackPatch.points_value = task.points_value;
      }
      if (data.schedule_id !== undefined) {
        currentRollbackPatch.schedule_id = task.schedule_id;
      }
      if (data.initial_image_s3_key !== undefined) {
        currentRollbackPatch.initial_image_s3_key = task.initial_image_s3_key;
      }
      if (data.proof_s3_key !== undefined) {
        currentRollbackPatch.proof_s3_key = task.proof_s3_key;
      }
      if (data.assigned_to !== undefined) {
        currentRollbackPatch.assigned_to = task.assigned_to;
      }
      if (data.due_at !== undefined) {
        currentRollbackPatch.due_at = task.due_at;
      }
      if (data.expires_at !== undefined) {
        currentRollbackPatch.expires_at = task.expires_at;
      }
      if (data.unlock_at !== undefined) {
        currentRollbackPatch.unlock_at = task.unlock_at;
      }
      if (data.is_fine !== undefined) {
        currentRollbackPatch.is_fine = task.is_fine;
      }
      if (data.notification_level !== undefined) {
        currentRollbackPatch.notification_level = task.notification_level;
      }
      if (data.execution_limit !== undefined) {
        currentRollbackPatch.execution_limit = task.execution_limit;
      }
      if (data.completed_at !== undefined) {
        currentRollbackPatch.completed_at = task.completed_at;
      }
      if (Object.keys(currentRollbackPatch).length > 0) {
        await this.taskRepository
          .update(task.id, currentRollbackPatch)
          .catch(() => undefined);
      }

      if (previousSchedule && Object.keys(schedulePatch).length > 0) {
        const scheduleRollbackPatch: Partial<CreateScheduleDTO> = {};
        if (schedulePatch.title !== undefined) {
          scheduleRollbackPatch.title = previousSchedule.title;
        }
        if (schedulePatch.description !== undefined) {
          scheduleRollbackPatch.description = previousSchedule.description;
        }
        if (schedulePatch.assigned_to !== undefined) {
          scheduleRollbackPatch.assigned_to = previousSchedule.assigned_to;
        }
        if (schedulePatch.points_value !== undefined) {
          scheduleRollbackPatch.points_value = previousSchedule.points_value;
        }
        scheduleRollbackPatch.last_generated_at =
          previousSchedule.last_generated_at;

        await this.taskRepository
          .updateSchedule(task.schedule_id, scheduleRollbackPatch)
          .catch(() => undefined);
      }

      throw error;
    }
  }

  /**
   * Updates the task and all other instances in the series (entire series).
   * @param effectiveFromDueAt Kept for interface consistency with this_and_future variants; unused for entire_series.
   */
  async updateTaskEntireSeries(
    task: HousingTask,
    data: Partial<CreateAssignmentDTO>,
    effectiveFromDueAt?: string,
  ) {
    void effectiveFromDueAt;
    if (!task.schedule_id) {
      return await this.taskRepository.update(task.id, data);
    }

    const seriesTasks = await this.findAllNonFinalByScheduleId(
      task.schedule_id,
    );
    const futureTaskPatch = this.toFutureTaskPatch(data);
    const schedulePatch = this.toSchedulePatch(data);
    const futureTargets = seriesTasks.filter(
      (seriesTask) => seriesTask.id !== task.id,
    );
    const previousSchedule =
      Object.keys(schedulePatch).length > 0
        ? await this.taskRepository.findScheduleById(task.schedule_id)
        : null;

    try {
      await this.taskRepository.update(task.id, data);

      if (Object.keys(futureTaskPatch).length > 0) {
        const updateResults = await Promise.allSettled(
          futureTargets.map((seriesTask) =>
            this.taskRepository.update(seriesTask.id, futureTaskPatch),
          ),
        );
        const updateFailure = updateResults.find(
          (result) => result.status === "rejected",
        );
        if (updateFailure && updateFailure.status === "rejected") {
          throw updateFailure.reason;
        }
      }

      if (Object.keys(schedulePatch).length > 0) {
        await this.taskRepository.updateSchedule(task.schedule_id, {
          ...schedulePatch,
          last_generated_at: new Date().toISOString(),
        });
      }

      return await this.taskRepository.findById(task.id);
    } catch (error) {
      if (Object.keys(futureTaskPatch).length > 0) {
        await Promise.allSettled(
          futureTargets.map((seriesTask) => {
            const rollbackPatch: Partial<CreateAssignmentDTO> = {};
            if (futureTaskPatch.title !== undefined) {
              rollbackPatch.title = seriesTask.title;
            }
            if (futureTaskPatch.description !== undefined) {
              rollbackPatch.description = seriesTask.description;
            }
            if (futureTaskPatch.assigned_to !== undefined) {
              rollbackPatch.assigned_to = seriesTask.assigned_to;
            }
            if (futureTaskPatch.points_value !== undefined) {
              rollbackPatch.points_value = seriesTask.points_value;
            }
            return Object.keys(rollbackPatch).length > 0
              ? this.taskRepository.update(seriesTask.id, rollbackPatch)
              : Promise.resolve();
          }),
        );
      }

      const currentRollbackPatch: Partial<CreateAssignmentDTO> = {};
      if (data.title !== undefined) {
        currentRollbackPatch.title = task.title;
      }
      if (data.description !== undefined) {
        currentRollbackPatch.description = task.description;
      }
      if (data.status !== undefined) {
        currentRollbackPatch.status = task.status;
      }
      if (data.type !== undefined) {
        currentRollbackPatch.type = task.type;
      }
      if (data.points_value !== undefined) {
        currentRollbackPatch.points_value = task.points_value;
      }
      if (data.schedule_id !== undefined) {
        currentRollbackPatch.schedule_id = task.schedule_id;
      }
      if (data.initial_image_s3_key !== undefined) {
        currentRollbackPatch.initial_image_s3_key = task.initial_image_s3_key;
      }
      if (data.proof_s3_key !== undefined) {
        currentRollbackPatch.proof_s3_key = task.proof_s3_key;
      }
      if (data.assigned_to !== undefined) {
        currentRollbackPatch.assigned_to = task.assigned_to;
      }
      if (data.due_at !== undefined) {
        currentRollbackPatch.due_at = task.due_at;
      }
      if (data.expires_at !== undefined) {
        currentRollbackPatch.expires_at = task.expires_at;
      }
      if (data.unlock_at !== undefined) {
        currentRollbackPatch.unlock_at = task.unlock_at;
      }
      if (data.is_fine !== undefined) {
        currentRollbackPatch.is_fine = task.is_fine;
      }
      if (data.notification_level !== undefined) {
        currentRollbackPatch.notification_level = task.notification_level;
      }
      if (data.execution_limit !== undefined) {
        currentRollbackPatch.execution_limit = task.execution_limit;
      }
      if (data.completed_at !== undefined) {
        currentRollbackPatch.completed_at = task.completed_at;
      }
      if (Object.keys(currentRollbackPatch).length > 0) {
        await this.taskRepository
          .update(task.id, currentRollbackPatch)
          .catch(() => undefined);
      }

      if (previousSchedule && Object.keys(schedulePatch).length > 0) {
        const scheduleRollbackPatch: Partial<CreateScheduleDTO> = {};
        if (schedulePatch.title !== undefined) {
          scheduleRollbackPatch.title = previousSchedule.title;
        }
        if (schedulePatch.description !== undefined) {
          scheduleRollbackPatch.description = previousSchedule.description;
        }
        if (schedulePatch.assigned_to !== undefined) {
          scheduleRollbackPatch.assigned_to = previousSchedule.assigned_to;
        }
        if (schedulePatch.points_value !== undefined) {
          scheduleRollbackPatch.points_value = previousSchedule.points_value;
        }
        scheduleRollbackPatch.last_generated_at =
          previousSchedule.last_generated_at;

        await this.taskRepository
          .updateSchedule(task.schedule_id, scheduleRollbackPatch)
          .catch(() => undefined);
      }

      throw error;
    }
  }

  /**
   * Soft-deactivates the schedule before deleting future rows so hourly `ensureFutureTasksJob`
   * cannot recreate instances while cleanup runs (see `docs/behavior.md` delete rules).
   */
  async deleteTaskThisAndFuture(task: HousingTask, effectiveFromDueAt: string) {
    if (!task.schedule_id) {
      await this.taskRepository.delete(task.id);
      return;
    }

    const schedule = await this.taskRepository.findScheduleById(
      task.schedule_id,
    );
    if (schedule?.active) {
      await this.taskRepository.updateSchedule(task.schedule_id, {
        active: false,
        last_generated_at: new Date().toISOString(),
      });
    }

    const effectiveFrom = new Date(effectiveFromDueAt);
    const seriesTasks = await this.findAllNonFinalByScheduleId(
      task.schedule_id,
    );
    const futureTaskIds = seriesTasks
      .filter((seriesTask) => {
        if (seriesTask.id === task.id) {
          return false;
        }
        if (!seriesTask.due_at) {
          return false;
        }
        return new Date(seriesTask.due_at) >= effectiveFrom;
      })
      .map((seriesTask) => seriesTask.id);
    const taskIdsToDelete = [task.id, ...futureTaskIds];

    const deleteResults = await Promise.allSettled(
      taskIdsToDelete.map((taskId) => this.taskRepository.delete(taskId)),
    );
    const deleteFailure = deleteResults.find(
      (result) => result.status === "rejected",
    );
    if (deleteFailure && deleteFailure.status === "rejected") {
      const message =
        deleteFailure.reason instanceof Error
          ? deleteFailure.reason.message
          : String(deleteFailure.reason);
      throw new Error(
        `Series deactivated but one or more task rows failed to delete: ${message}`,
      );
    }
  }

  /**
   * Deletes the task and all instances in the series (entire series).
   * @param effectiveFromDueAt Kept for interface consistency with this_and_future variants; unused for entire_series.
   */
  async deleteTaskEntireSeries(task: HousingTask, effectiveFromDueAt?: string) {
    void effectiveFromDueAt;
    if (!task.schedule_id) {
      await this.taskRepository.delete(task.id);
      return;
    }

    await this.taskRepository.updateSchedule(task.schedule_id, {
      active: false,
      last_generated_at: new Date().toISOString(),
    });

    const seriesTasks = await this.findAllNonFinalByScheduleId(
      task.schedule_id,
    );

    await this.taskRepository.delete(task.id);

    await Promise.all(
      seriesTasks
        .filter((seriesTask) => seriesTask.id !== task.id)
        .map((seriesTask) => this.taskRepository.delete(seriesTask.id)),
    );
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
