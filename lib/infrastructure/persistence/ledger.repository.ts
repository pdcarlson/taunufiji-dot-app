/**
 * Appwrite Ledger Repository Implementation
 *
 * Implements ILedgerRepository using Appwrite as the data store.
 */

import { Query, ID } from "node-appwrite";
import { getDatabase } from "./client";
import { DB_ID, COLLECTIONS, LedgerSchema } from "@/lib/domain/entities/schema";
import {
  ILedgerRepository,
  LedgerQueryOptions,
  LedgerEntry,
} from "@/lib/domain/ports/ledger.repository";
import { DatabaseError } from "@/lib/domain/errors";

export class AppwriteLedgerRepository implements ILedgerRepository {
  // =========================================================================
  // Queries
  // =========================================================================

  async findById(id: string): Promise<LedgerEntry | null> {
    try {
      const db = getDatabase();
      const doc = await db.getDocument(DB_ID, COLLECTIONS.LEDGER, id);
      return doc as unknown as LedgerEntry;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw new DatabaseError(`findById(${id})`, error);
    }
  }

  async findByUser(
    userId: string,
    category?: LedgerSchema["category"],
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
      return result.documents as unknown as LedgerEntry[];
    } catch (error: unknown) {
      throw new DatabaseError(`findByUser(${userId})`, error);
    }
  }

  async findMany(options: LedgerQueryOptions): Promise<LedgerEntry[]> {
    try {
      const db = getDatabase();
      const queries = this.buildLedgerQueries(options);

      const result = await db.listDocuments(DB_ID, COLLECTIONS.LEDGER, queries);
      return result.documents as unknown as LedgerEntry[];
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

  async create(data: LedgerSchema): Promise<LedgerEntry> {
    try {
      const db = getDatabase();
      const doc = await db.createDocument(
        DB_ID,
        COLLECTIONS.LEDGER,
        ID.unique(),
        data,
      );
      return doc as unknown as LedgerEntry;
    } catch (error: unknown) {
      throw new DatabaseError("create", error);
    }
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

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

    // Default ordering by timestamp descending
    queries.push(Query.orderDesc("timestamp"));

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
