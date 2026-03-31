/**
 * Task Repository Interface
 *
 * Defines the contract for task (assignment) data access.
 * Implementations should handle the specifics of the data store.
 */

import { HousingTask, CreateAssignmentDTO } from "@/lib/domain/types/task";
import {
  HousingSchedule,
  CreateScheduleDTO,
} from "@/lib/domain/types/schedule";

/**
 * Query options for listing tasks
 */
export interface TaskQueryOptions {
  status?: HousingTask["status"] | HousingTask["status"][];
  type?: HousingTask["type"] | HousingTask["type"][];
  assignedTo?: string;
  scheduleId?: string;
  notificationLevel?: HousingTask["notification_level"];
  /** `notification_level` is null/unset OR equals this value (Appwrite OR query). */
  notificationLevelOrNull?: NonNullable<HousingTask["notification_level"]>;
  /** When true, only tasks with a non-empty `assigned_to`. */
  assignedToPresent?: boolean;
  /** When true, only tasks with a non-empty `schedule_id`. */
  scheduleIdPresent?: boolean;
  /** When true, only tasks with no proof key (missed-duty / expiry candidates). */
  proofS3KeyAbsent?: boolean;
  /**
   * When true, only tasks where `is_fine` is unset or false (missed-duty fine not yet persisted).
   * Pair with `status: "expired"`, `assignedToPresent: true`, and usually `proofS3KeyAbsent: true`
   * for fine retry scans (submitted work should not receive missed-duty fines).
   */
  fineNotApplied?: boolean;
  /**
   * With `status: "expired"`, restrict to tasks that have not finished the expired-notification path
   * (`notification_level` is absent, pre-final stages, or `expired_admin` awaiting assignee DM).
   */
  expiredNotificationIncomplete?: boolean;
  dueBefore?: Date;
  unlockBefore?: Date;
  limit?: number;
  offset?: number;
  orderBy?: "createdAt" | "due_at" | "unlock_at";
  orderDirection?: "asc" | "desc";
}

/**
 * Task Repository Interface
 */
export interface ITaskRepository {
  // =========================================================================
  // Task Queries
  // =========================================================================

  /**
   * Find a task by its ID
   * @returns Task or null if not found
   */
  findById(id: string): Promise<HousingTask | null>;

  /**
   * Find all open tasks (status = 'open')
   */
  findOpen(): Promise<HousingTask[]>;

  /**
   * Find all pending tasks (status = 'pending')
   */
  findPending(): Promise<HousingTask[]>;

  /**
   * Find tasks assigned to a specific user
   */
  findByAssignee(userId: string): Promise<HousingTask[]>;

  /**
   * Find tasks matching query options
   */
  findMany(options: TaskQueryOptions): Promise<HousingTask[]>;

  // =========================================================================
  // Task Commands
  // =========================================================================

  /**
   * Create a new task
   */
  create(data: CreateAssignmentDTO): Promise<HousingTask>;

  /**
   * Update an existing task
   */
  update(id: string, data: Partial<CreateAssignmentDTO>): Promise<HousingTask>;

  /**
   * Delete a task by ID
   */
  delete(id: string): Promise<void>;

  // =========================================================================
  // Schedule Queries
  // =========================================================================

  /**
   * Find a schedule by its ID
   */
  findScheduleById(id: string): Promise<HousingSchedule | null>;

  /**
   * Find all active schedules
   */
  findActiveSchedules(): Promise<HousingSchedule[]>;

  // =========================================================================
  // Schedule Commands
  // =========================================================================

  /**
   * Create a new schedule
   */
  createSchedule(data: CreateScheduleDTO): Promise<HousingSchedule>;

  /**
   * Update an existing schedule
   */
  updateSchedule(
    id: string,
    data: Partial<CreateScheduleDTO>,
  ): Promise<HousingSchedule>;
}
