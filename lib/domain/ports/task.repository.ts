/**
 * Task Repository Interface
 *
 * Defines the contract for task (assignment) data access.
 * Implementations should handle the specifics of the data store.
 */

import { HousingTask, HousingSchedule } from "@/lib/domain/entities/models";
import { AssignmentSchema, ScheduleSchema } from "@/lib/domain/entities/schema";

/**
 * Query options for listing tasks
 */
export interface TaskQueryOptions {
  status?: AssignmentSchema["status"] | AssignmentSchema["status"][];
  type?: AssignmentSchema["type"] | AssignmentSchema["type"][];
  assignedTo?: string;
  scheduleId?: string;
  notificationLevel?: AssignmentSchema["notification_level"];
  dueBefore?: Date;
  unlockBefore?: Date;
  limit?: number;
  orderBy?: "createdAt" | "dueAt";
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
  create(data: Omit<AssignmentSchema, never>): Promise<HousingTask>;

  /**
   * Update an existing task
   */
  update(id: string, data: Partial<AssignmentSchema>): Promise<HousingTask>;

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
  createSchedule(data: Omit<ScheduleSchema, never>): Promise<HousingSchedule>;

  /**
   * Update an existing schedule
   */
  updateSchedule(
    id: string,
    data: Partial<ScheduleSchema>,
  ): Promise<HousingSchedule>;
}
