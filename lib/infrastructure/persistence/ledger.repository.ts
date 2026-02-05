/**
 * Appwrite Ledger Repository Implementation
 *
 * Implements ILedgerRepository using Appwrite as the data store.
 */

import { Query, ID, Models } from "node-appwrite";
import { getDatabase } from "./client";
import { DB_ID, COLLECTIONS } from "@/lib/infrastructure/config/schema";
import {
  ILedgerRepository,
  LedgerQueryOptions,
} from "@/lib/domain/ports/ledger.repository";
import {
  LedgerEntry,
  CreateLedgerDTO,
  LedgerEntrySchema,
} from "@/lib/domain/types/ledger";
import { DatabaseError } from "@/lib/domain/errors";

export class AppwriteLedgerRepository implements ILedgerRepository {
  // =========================================================================
  // Queries
  // =========================================================================

  async findById(id: string): Promise<LedgerEntry | null> {
    try {
      const db = getDatabase();
      const doc = await db.getDocument(DB_ID, COLLECTIONS.LEDGER, id);
      return this.toDomain(doc);
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw new DatabaseError(`findById(${id})`, error);
    }
  }

  async findByUser(
    userId: string,
    category?: LedgerEntry["category"],
    limit?: number,
  ): Promise<LedgerEntry[]> {
    const queries: string[] = [
      Query.equal("user_id", userId),
      Query.orderDesc("timestamp"),
      Query.limit(limit ?? 100),
    ];

    if (category) {
      queries.push(Query.equal("category", category));
    }

    try {
      const db = getDatabase();
      const result = await db.listDocuments(DB_ID, COLLECTIONS.LEDGER, queries);
      return result.documents.map((doc) => this.toDomain(doc));
    } catch (error: unknown) {
      throw new DatabaseError(`findByUser(${userId})`, error);
    }
  }

  async findMany(options: LedgerQueryOptions): Promise<LedgerEntry[]> {
    try {
      const db = getDatabase();
      const queries = this.buildLedgerQueries(options);

      const result = await db.listDocuments(DB_ID, COLLECTIONS.LEDGER, queries);
      return result.documents.map((doc) => this.toDomain(doc));
    } catch (error: unknown) {
      throw new DatabaseError("findMany", error);
    }
  }

  async getTotalPoints(userId: string): Promise<number> {
    try {
      // Fetch all entries for this user
      const entries = await this.findByUser(userId, undefined, 1000);

      // Calculate total (considering is_debit flag)
      return entries.reduce((total, entry) => {
        const amount = entry.is_debit ? -entry.amount : entry.amount;
        return total + amount;
      }, 0);
    } catch (error: unknown) {
      throw new DatabaseError(`getTotalPoints(${userId})`, error);
    }
  }

  // =========================================================================
  // Commands
  // =========================================================================

  async create(data: CreateLedgerDTO): Promise<LedgerEntry> {
    try {
      const db = getDatabase();
      const doc = await db.createDocument(
        DB_ID,
        COLLECTIONS.LEDGER,
        ID.unique(),
        data,
      );
      return this.toDomain(doc);
    } catch (error: unknown) {
      throw new DatabaseError("create", error);
    }
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private toDomain(doc: Models.Document): LedgerEntry {
    const domainEntry = {
      ...doc,
      id: doc.$id,
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
    };
    return LedgerEntrySchema.parse(domainEntry);
  }

  private buildLedgerQueries(options: LedgerQueryOptions): string[] {
    const queries: string[] = [];

    if (options.userId) {
      queries.push(Query.equal("user_id", options.userId));
    }

    if (options.category) {
      queries.push(Query.equal("category", options.category));
    }

    if (options.startDate) {
      queries.push(
        Query.greaterThanEqual("timestamp", options.startDate.toISOString()),
      );
    }

    if (options.endDate) {
      queries.push(
        Query.lessThanEqual("timestamp", options.endDate.toISOString()),
      );
    }

    // Ordering
    const orderBy = options.orderBy || "timestamp";
    // Check if orderBy is a domain field that needs mapping (e.g. 'createdAt' -> '$createdAt')
    // LedgerEntry fields: id, amount, reason, category, timestamp, is_debit, createdAt, updatedAt
    // 'timestamp' is a custom attribute, so no mapping needed. 'createdAt' needs mapping.
    let dbField = orderBy;
    if (orderBy === "createdAt") dbField = "$createdAt";

    if (options.orderDirection === "asc") {
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
