/**
 * Appwrite Task Repository Implementation
 *
 * Implements ITaskRepository using Appwrite as the data store.
 */

import { Query, ID, Models } from "node-appwrite";
import { getDatabase } from "./client";
import { DB_ID, COLLECTIONS } from "@/lib/infrastructure/config/schema";
import {
  ITaskRepository,
  TaskQueryOptions,
} from "@/lib/domain/ports/task.repository";
import {
  HousingTask,
  CreateAssignmentDTO,
  HousingTaskSchema,
} from "@/lib/domain/types/task";
import {
  HousingSchedule,
  CreateScheduleDTO,
  HousingScheduleSchema,
} from "@/lib/domain/types/schedule";
import { NotFoundError, DatabaseError } from "@/lib/domain/errors";

export class AppwriteTaskRepository implements ITaskRepository {
  // =========================================================================
  // Task Queries
  // =========================================================================

  async findById(id: string): Promise<HousingTask | null> {
    try {
      const db = getDatabase();
      const doc = await db.getDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, id);
      return this.toTaskDomain(doc);
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
      return result.documents.map((doc) => this.toTaskDomain(doc));
    } catch (error: unknown) {
      throw new DatabaseError("findMany", error);
    }
  }

  // =========================================================================
  // Task Commands
  // =========================================================================

  async create(data: CreateAssignmentDTO): Promise<HousingTask> {
    try {
      const db = getDatabase();
      const doc = await db.createDocument(
        DB_ID,
        COLLECTIONS.ASSIGNMENTS,
        ID.unique(),
        data,
      );
      return this.toTaskDomain(doc);
    } catch (error: unknown) {
      throw new DatabaseError("create", error);
    }
  }

  async update(
    id: string,
    data: Partial<CreateAssignmentDTO>,
  ): Promise<HousingTask> {
    try {
      const db = getDatabase();
      const doc = await db.updateDocument(
        DB_ID,
        COLLECTIONS.ASSIGNMENTS,
        id,
        data,
      );
      return this.toTaskDomain(doc);
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
      return this.toScheduleDomain(doc);
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
      return result.documents.map((doc) => this.toScheduleDomain(doc));
    } catch (error: unknown) {
      throw new DatabaseError("findActiveSchedules", error);
    }
  }

  // =========================================================================
  // Schedule Commands
  // =========================================================================

  async createSchedule(data: CreateScheduleDTO): Promise<HousingSchedule> {
    try {
      const db = getDatabase();
      const doc = await db.createDocument(
        DB_ID,
        COLLECTIONS.SCHEDULES,
        ID.unique(),
        data,
      );
      return this.toScheduleDomain(doc);
    } catch (error: unknown) {
      throw new DatabaseError("createSchedule", error);
    }
  }

  async updateSchedule(
    id: string,
    data: Partial<CreateScheduleDTO>,
  ): Promise<HousingSchedule> {
    try {
      const db = getDatabase();
      const doc = await db.updateDocument(
        DB_ID,
        COLLECTIONS.SCHEDULES,
        id,
        data,
      );
      return this.toScheduleDomain(doc);
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

  /**
   * Maps Appwrite Document to HousingTask
   */
  private toTaskDomain(doc: Models.Document): HousingTask {
    const domainTask = {
      ...doc,
      id: doc.$id,
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
    };
    return HousingTaskSchema.parse(domainTask);
  }

  /**
   * Maps Appwrite Document to HousingSchedule
   */
  private toScheduleDomain(doc: Models.Document): HousingSchedule {
    const domainSchedule = {
      ...doc,
      id: doc.$id,
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
    };
    return HousingScheduleSchema.parse(domainSchedule);
  }

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
    const orderBy = options.orderBy || "createdAt";
    const orderDir = options.orderDirection || "desc";

    let dbField: string = orderBy;
    if (orderBy === "createdAt") dbField = "$createdAt";

    if (orderDir === "asc") {
      queries.push(Query.orderAsc(dbField));
    } else {
      queries.push(Query.orderDesc(dbField));
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
