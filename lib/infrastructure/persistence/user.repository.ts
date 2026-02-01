/**
 * Appwrite User Repository Implementation
 *
 * Implements IUserRepository using Appwrite as the data store.
 */

import { Query, ID } from "node-appwrite";
import { getDatabase } from "./client";
import { DB_ID, COLLECTIONS, UserSchema } from "@/lib/domain/entities/appwrite.schema";
import {
  IUserRepository,
  UserQueryOptions,
} from "@/lib/domain/ports/user.repository";
import { Member } from "@/lib/domain/entities";
import { NotFoundError, DatabaseError } from "@/lib/domain/errors";

export class AppwriteUserRepository implements IUserRepository {
  // =========================================================================
  // Queries
  // =========================================================================

  async findById(id: string): Promise<Member | null> {
    try {
      const db = getDatabase();
      const doc = await db.getDocument(DB_ID, COLLECTIONS.USERS, id);
      return doc as unknown as Member;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw new DatabaseError(`findById(${id})`, error);
    }
  }

  async findByAuthId(authId: string): Promise<Member | null> {
    try {
      const db = getDatabase();
      const result = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
        Query.equal("auth_id", authId),
        Query.limit(1),
      ]);

      if (result.documents.length === 0) {
        return null;
      }

      return result.documents[0] as unknown as Member;
    } catch (error: unknown) {
      throw new DatabaseError(`findByAuthId(${authId})`, error);
    }
  }

  async findByDiscordId(discordId: string): Promise<Member | null> {
    try {
      const db = getDatabase();
      const result = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
        Query.equal("discord_id", discordId),
        Query.limit(1),
      ]);

      if (result.documents.length === 0) {
        return null;
      }

      return result.documents[0] as unknown as Member;
    } catch (error: unknown) {
      throw new DatabaseError(`findByDiscordId(${discordId})`, error);
    }
  }

  async findTopByPoints(limit: number): Promise<Member[]> {
    try {
      const db = getDatabase();
      const result = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
        Query.equal("status", "active"),
        Query.orderDesc("details_points_current"),
        Query.limit(limit),
      ]);

      return result.documents as unknown as Member[];
    } catch (error: unknown) {
      throw new DatabaseError(`findTopByPoints(${limit})`, error);
    }
  }

  async findMany(options: UserQueryOptions): Promise<Member[]> {
    try {
      const db = getDatabase();
      const queries = this.buildUserQueries(options);

      const result = await db.listDocuments(DB_ID, COLLECTIONS.USERS, queries);
      return result.documents as unknown as Member[];
    } catch (error: unknown) {
      throw new DatabaseError("findMany", error);
    }
  }

  // =========================================================================
  // Commands
  // =========================================================================

  async create(data: UserSchema): Promise<Member> {
    try {
      const db = getDatabase();
      const doc = await db.createDocument(
        DB_ID,
        COLLECTIONS.USERS,
        ID.unique(),
        data,
      );
      return doc as unknown as Member;
    } catch (error: unknown) {
      throw new DatabaseError("create", error);
    }
  }

  async update(id: string, data: Partial<UserSchema>): Promise<Member> {
    try {
      const db = getDatabase();
      const doc = await db.updateDocument(DB_ID, COLLECTIONS.USERS, id, data);
      return doc as unknown as Member;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundError("User", id);
      }
      throw new DatabaseError(`update(${id})`, error);
    }
  }

  async updatePoints(id: string, delta: number): Promise<Member> {
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
  // Private Helpers
  // =========================================================================

  private buildUserQueries(options: UserQueryOptions): string[] {
    const queries: string[] = [];

    if (options.status) {
      queries.push(Query.equal("status", options.status));
    }

    // Ordering
    if (options.orderBy === "points") {
      queries.push(
        options.orderDirection === "asc"
          ? Query.orderAsc("details_points_current")
          : Query.orderDesc("details_points_current"),
      );
    } else {
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
