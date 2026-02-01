/**
 * Appwrite Task Repository Implementation
 *
 * Implements ITaskRepository using Appwrite as the data store.
 */

import { Query, ID } from "node-appwrite";
import { getDatabase } from "./client";
import { DB_ID, COLLECTIONS } from "@/lib/domain/entities/appwrite.schema";
import {
  ITaskRepository,
  TaskQueryOptions,
} from "@/lib/domain/ports/task.repository";
import { HousingTask, HousingSchedule } from "@/lib/domain/entities";
import { AssignmentSchema, ScheduleSchema } from "@/lib/domain/entities/appwrite.schema";
import { NotFoundError, DatabaseError } from "@/lib/domain/errors";

export class AppwriteTaskRepository implements ITaskRepository {
  // =========================================================================
  // Task Queries
  // =========================================================================

  async findById(id: string): Promise<HousingTask | null> {
    try {
      const db = getDatabase();
      const doc = await db.getDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, id);
      return doc as unknown as HousingTask;
    } catch (error: unknown) {
      // Handle 404 as null return
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw new DatabaseError(`findById(${id})`, error);
    }
  }

  async findOpen(): Promise<HousingTask[]> {
    return this.findMany({
      status: "open",
      orderBy: "createdAt",
      orderDirection: "desc",
    });
  }

  async findPending(): Promise<HousingTask[]> {
    return this.findMany({
      status: "pending",
      orderBy: "createdAt",
      orderDirection: "desc",
    });
  }

  async findByAssignee(userId: string): Promise<HousingTask[]> {
    return this.findMany({
      assignedTo: userId,
      orderBy: "createdAt",
      orderDirection: "desc",
    });
  }

  async findMany(options: TaskQueryOptions): Promise<HousingTask[]> {
    try {
      const db = getDatabase();
      const queries = this.buildTaskQueries(options);

      const result = await db.listDocuments(
        DB_ID,
        COLLECTIONS.ASSIGNMENTS,
        queries,
      );
      return result.documents as unknown as HousingTask[];
    } catch (error: unknown) {
      throw new DatabaseError("findMany", error);
    }
  }

  // =========================================================================
  // Task Commands
  // =========================================================================

  async create(data: AssignmentSchema): Promise<HousingTask> {
    try {
      const db = getDatabase();
      const doc = await db.createDocument(
        DB_ID,
        COLLECTIONS.ASSIGNMENTS,
        ID.unique(),
        data,
      );
      return doc as unknown as HousingTask;
    } catch (error: unknown) {
      throw new DatabaseError("create", error);
    }
  }

  async update(
    id: string,
    data: Partial<AssignmentSchema>,
  ): Promise<HousingTask> {
    try {
      const db = getDatabase();
      const doc = await db.updateDocument(
        DB_ID,
        COLLECTIONS.ASSIGNMENTS,
        id,
        data,
      );
      return doc as unknown as HousingTask;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundError("Task", id);
      }
      throw new DatabaseError(`update(${id})`, error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const db = getDatabase();
      await db.deleteDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, id);
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundError("Task", id);
      }
      throw new DatabaseError(`delete(${id})`, error);
    }
  }

  // =========================================================================
  // Schedule Queries
  // =========================================================================

  async findScheduleById(id: string): Promise<HousingSchedule | null> {
    try {
      const db = getDatabase();
      const doc = await db.getDocument(DB_ID, COLLECTIONS.SCHEDULES, id);
      return doc as unknown as HousingSchedule;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw new DatabaseError(`findScheduleById(${id})`, error);
    }
  }

  async findActiveSchedules(): Promise<HousingSchedule[]> {
    try {
      const db = getDatabase();
      const result = await db.listDocuments(DB_ID, COLLECTIONS.SCHEDULES, [
        Query.equal("active", true),
      ]);
      return result.documents as unknown as HousingSchedule[];
    } catch (error: unknown) {
      throw new DatabaseError("findActiveSchedules", error);
    }
  }

  // =========================================================================
  // Schedule Commands
  // =========================================================================

  async createSchedule(data: ScheduleSchema): Promise<HousingSchedule> {
    try {
      const db = getDatabase();
      const doc = await db.createDocument(
        DB_ID,
        COLLECTIONS.SCHEDULES,
        ID.unique(),
        data,
      );
      return doc as unknown as HousingSchedule;
    } catch (error: unknown) {
      throw new DatabaseError("createSchedule", error);
    }
  }

  async updateSchedule(
    id: string,
    data: Partial<ScheduleSchema>,
  ): Promise<HousingSchedule> {
    try {
      const db = getDatabase();
      const doc = await db.updateDocument(
        DB_ID,
        COLLECTIONS.SCHEDULES,
        id,
        data,
      );
      return doc as unknown as HousingSchedule;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundError("Schedule", id);
      }
      throw new DatabaseError(`updateSchedule(${id})`, error);
    }
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private buildTaskQueries(options: TaskQueryOptions): string[] {
    const queries: string[] = [];

    if (options.status) {
      if (Array.isArray(options.status)) {
        queries.push(Query.equal("status", options.status));
      } else {
        queries.push(Query.equal("status", options.status));
      }
    }

    if (options.type) {
      if (Array.isArray(options.type)) {
        queries.push(Query.equal("type", options.type));
      } else {
        queries.push(Query.equal("type", options.type));
      }
    }

    if (options.assignedTo) {
      queries.push(Query.equal("assigned_to", options.assignedTo));
    }

    if (options.scheduleId) {
      queries.push(Query.equal("schedule_id", options.scheduleId));
    }

    if (options.notificationLevel) {
      queries.push(
        Query.equal("notification_level", options.notificationLevel),
      );
    }

    if (options.dueBefore) {
      queries.push(
        Query.lessThanEqual("due_at", options.dueBefore.toISOString()),
      );
    }

    if (options.unlockBefore) {
      queries.push(
        Query.lessThanEqual("unlock_at", options.unlockBefore.toISOString()),
      );
    }

    // Ordering
    if (options.orderBy === "dueAt") {
      queries.push(
        options.orderDirection === "asc"
          ? Query.orderAsc("due_at")
          : Query.orderDesc("due_at"),
      );
    } else {
      // Default to createdAt
      queries.push(
        options.orderDirection === "asc"
          ? Query.orderAsc("$createdAt")
          : Query.orderDesc("$createdAt"),
      );
    }

    // Limit
    queries.push(Query.limit(options.limit ?? 100));

    return queries;
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 404
    );
  }
}
