/**
 * User Repository Interface
 *
 * Defines the contract for user data access.
 * Implementations should handle the specifics of the data store.
 */

import { Member } from "@/lib/domain/entities";
import { UserSchema } from "@/lib/domain/entities/appwrite.schema";

/**
 * Query options for listing users
 */
export interface UserQueryOptions {
  status?: UserSchema["status"];
  limit?: number;
  orderBy?: "points" | "createdAt";
  orderDirection?: "asc" | "desc";
}

/**
 * User Repository Interface
 */
export interface IUserRepository {
  // =========================================================================
  // Queries
  // =========================================================================

  /**
   * Find a user by document ID
   */
  findById(id: string): Promise<Member | null>;

  /**
   * Find a user by their auth ID (Appwrite Auth)
   */
  findByAuthId(authId: string): Promise<Member | null>;

  /**
   * Find a user by their Discord ID
   */
  findByDiscordId(discordId: string): Promise<Member | null>;

  /**
   * Find top users by points
   * @param limit Maximum number of users to return
   */
  findTopByPoints(limit: number): Promise<Member[]>;

  /**
   * Find users matching query options
   */
  findMany(options: UserQueryOptions): Promise<Member[]>;

  // =========================================================================
  // Commands
  // =========================================================================

  /**
   * Create a new user
   */
  create(data: Omit<UserSchema, never>): Promise<Member>;

  /**
   * Update an existing user
   */
  update(id: string, data: Partial<UserSchema>): Promise<Member>;

  /**
   * Update user points (convenience method with proper calculation)
   * @param id User document ID
   * @param delta Points to add (positive) or subtract (negative)
   */
  updatePoints(id: string, delta: number): Promise<Member>;
}
