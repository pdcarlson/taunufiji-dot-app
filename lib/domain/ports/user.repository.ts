/**
 * User Repository Interface
 *
 * Defines the contract for user data access.
 * Implementations should handle the specifics of the data store.
 */

import { User, CreateUserDTO } from "@/lib/domain/types/user";

/**
 * Query options for listing users
 */
export interface UserQueryOptions {
  status?: User["status"];
  limit?: number;
  orderBy?: "details_points_current" | "details_points_lifetime" | "createdAt";
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
  findById(id: string): Promise<User | null>;

  /**
   * Find a user by their auth ID (Appwrite Auth)
   */
  findByAuthId(authId: string): Promise<User | null>;

  /**
   * Find a user by their Discord ID
   */
  findByDiscordId(discordId: string): Promise<User | null>;

  /**
   * Find top users by points
   * @param limit Maximum number of users to return
   */
  findTopByPoints(limit: number): Promise<User[]>;

  /**
   * Find users matching query options
   */
  findMany(options: UserQueryOptions): Promise<User[]>;

  // =========================================================================
  // Commands
  // =========================================================================

  /**
   * Create a new user
   */
  create(data: CreateUserDTO): Promise<User>;

  /**
   * Update an existing user
   */
  update(id: string, data: Partial<CreateUserDTO>): Promise<User>;

  /**
   * Update user points (convenience method with proper calculation)
   * @param id User document ID
   * @param delta Points to add (positive) or subtract (negative)
   */
  updatePoints(id: string, delta: number): Promise<User>;
  /**
   * Count users with points greater than a certain value
   */
  countWithPointsGreaterThan(points: number): Promise<number>;
}
