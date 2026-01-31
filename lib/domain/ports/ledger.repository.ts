/**
 * Ledger Repository Interface
 *
 * Defines the contract for ledger (points history) data access.
 * Implementations should handle the specifics of the data store.
 */

import { Models } from "node-appwrite";
import { LedgerSchema } from "@/lib/domain/entities/schema";

/**
 * Ledger entry with document metadata
 */
export type LedgerEntry = Models.Document & LedgerSchema;

/**
 * Query options for listing ledger entries
 */
export interface LedgerQueryOptions {
  userId?: string;
  category?: LedgerSchema["category"];
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Ledger Repository Interface
 */
export interface ILedgerRepository {
  // =========================================================================
  // Queries
  // =========================================================================

  /**
   * Find a ledger entry by ID
   */
  findById(id: string): Promise<LedgerEntry | null>;

  /**
   * Find ledger entries for a specific user
   * @param userId Discord ID of the user
   * @param category Optional category filter
   * @param limit Maximum number of entries to return
   */
  findByUser(
    userId: string,
    category?: LedgerSchema["category"],
    limit?: number,
  ): Promise<LedgerEntry[]>;

  /**
   * Find ledger entries matching query options
   */
  findMany(options: LedgerQueryOptions): Promise<LedgerEntry[]>;

  /**
   * Get total points for a user (sum of all entries)
   * @param userId Discord ID of the user
   */
  getTotalPoints(userId: string): Promise<number>;

  // =========================================================================
  // Commands
  // =========================================================================

  /**
   * Create a new ledger entry
   */
  create(data: Omit<LedgerSchema, never>): Promise<LedgerEntry>;
}
