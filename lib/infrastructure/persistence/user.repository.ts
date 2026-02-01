/**
 * Appwrite User Repository Implementation
 *
 * Implements IUserRepository using Appwrite as the data store.
 */

import { Query, ID, Models } from "node-appwrite";
import { getDatabase } from "./client";
import { DB_ID, COLLECTIONS } from "@/lib/infrastructure/config/schema";
import {
  IUserRepository,
  UserQueryOptions,
} from "@/lib/domain/ports/user.repository";
import { User, CreateUserDTO, UserSchema } from "@/lib/domain/types/user";
import { NotFoundError, DatabaseError } from "@/lib/domain/errors";

export class AppwriteUserRepository implements IUserRepository {
  // =========================================================================
  // Queries
  // =========================================================================

  async findById(id: string): Promise<User | null> {
    try {
      const db = getDatabase();
      const doc = await db.getDocument(DB_ID, COLLECTIONS.USERS, id);
      return this.toDomain(doc);
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw new DatabaseError(`findById(${id})`, error);
    }
  }

  async findByAuthId(authId: string): Promise<User | null> {
    try {
      const db = getDatabase();
      const result = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
        Query.equal("auth_id", authId),
        Query.limit(1),
      ]);

      if (result.documents.length === 0) {
        return null;
      }

      return this.toDomain(result.documents[0]);
    } catch (error: unknown) {
      throw new DatabaseError(`findByAuthId(${authId})`, error);
    }
  }

  async findByDiscordId(discordId: string): Promise<User | null> {
    try {
      const db = getDatabase();
      const result = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
        Query.equal("discord_id", discordId),
        Query.limit(1),
      ]);

      if (result.documents.length === 0) {
        return null;
      }

      return this.toDomain(result.documents[0]);
    } catch (error: unknown) {
      throw new DatabaseError(`findByDiscordId(${discordId})`, error);
    }
  }

  async findTopByPoints(limit: number): Promise<User[]> {
    try {
      const db = getDatabase();
      const result = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
        Query.equal("status", "active"),
        Query.orderDesc("details_points_current"),
        Query.limit(limit),
      ]);

      return result.documents.map((doc) => this.toDomain(doc));
    } catch (error: unknown) {
      throw new DatabaseError(`findTopByPoints(${limit})`, error);
    }
  }

  async findMany(options: UserQueryOptions): Promise<User[]> {
    try {
      const db = getDatabase();
      const queries = this.buildUserQueries(options);

      const result = await db.listDocuments(DB_ID, COLLECTIONS.USERS, queries);
      return result.documents.map((doc) => this.toDomain(doc));
    } catch (error: unknown) {
      throw new DatabaseError("findMany", error);
    }
  }

  // =========================================================================
  // Commands
  // =========================================================================

  async create(data: CreateUserDTO): Promise<User> {
    try {
      const db = getDatabase();
      const doc = await db.createDocument(
        DB_ID,
        COLLECTIONS.USERS,
        ID.unique(),
        data,
      );
      return this.toDomain(doc);
    } catch (error: unknown) {
      throw new DatabaseError("create", error);
    }
  }

  async update(id: string, data: Partial<CreateUserDTO>): Promise<User> {
    try {
      const db = getDatabase();
      const doc = await db.updateDocument(DB_ID, COLLECTIONS.USERS, id, data);
      return this.toDomain(doc);
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundError("User", id);
      }
      throw new DatabaseError(`update(${id})`, error);
    }
  }

  async updatePoints(id: string, delta: number): Promise<User> {
    // First fetch current user to get current points
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }

    const newCurrentPoints = user.details_points_current + delta;
    const newLifetimePoints =
      delta > 0
        ? user.details_points_lifetime + delta
        : user.details_points_lifetime;

    return this.update(id, {
      details_points_current: newCurrentPoints,
      details_points_lifetime: newLifetimePoints,
    });
  }

  // =========================================================================
  async countWithPointsGreaterThan(points: number): Promise<number> {
    try {
      const db = getDatabase();
      const response = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
        Query.greaterThan("details_points_current", points),
        Query.limit(1),
      ]);
      return response.total;
    } catch (error) {
      throw new DatabaseError("countWithPointsGreaterThan", error);
    }
  }

  // Private Helpers
  // =========================================================================

  /**
   * Maps Appwrite Document to Domain Entity
   */
  private toDomain(doc: Models.Document): User {
    // 1. Remap System Fields
    const domainUser = {
      ...doc,
      id: doc.$id,
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
    };

    // 2. Validate with Zod
    // Parsing ensures we drop internal Appwrite fields ($permissions, etc)
    // and match the strict Domain Schema.
    return UserSchema.parse(domainUser);
  }

  private buildUserQueries(options: UserQueryOptions): string[] {
    const queries: string[] = [];

    if (options.status) {
      queries.push(Query.equal("status", options.status));
    }

    // Ordering
    const orderBy = options.orderBy || "createdAt";
    const orderDir = options.orderDirection || "desc";

    // Map Domain Field -> Appwrite Field
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
