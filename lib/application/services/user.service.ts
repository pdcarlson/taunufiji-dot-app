/**
 * User Service
 *
 * Provides user lookup and resolution. Uses repository pattern for data access.
 */

import { getContainer } from "@/lib/infrastructure/container";
import { Member } from "@/lib/domain/entities";

// Re-export type for backwards compatibility
export type UserDocument = Member;

export const UserService = {
  /**
   * Resolves an internal Appwrite User Document by their Discord ID (Attribute).
   * This is the Single Source of Truth for ID Resolution.
   * @param discordId The Discord Snowflake ID
   * @throws Error if user not found (caller must handle)
   */
  async getByDiscordId(discordId: string): Promise<UserDocument> {
    const { userRepository } = getContainer();
    const user = await userRepository.findByDiscordId(discordId);

    if (!user) {
      throw new Error(`User with Discord ID ${discordId} not found.`);
    }

    return user;
  },

  /**
   * Resolves an internal Appwrite User Document by their Auth ID.
   */
  async getByAuthId(authId: string): Promise<UserDocument> {
    const { userRepository } = getContainer();
    const user = await userRepository.findByAuthId(authId);

    if (!user) {
      throw new Error(`User with Auth ID ${authId} not found.`);
    }

    return user;
  },
};
