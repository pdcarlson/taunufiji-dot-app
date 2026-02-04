/**
 * User Service
 *
 * Provides user lookup and resolution. Uses repository pattern for data access.
 */

import { IUserRepository } from "@/lib/domain/ports/user.repository";
import { User } from "@/lib/domain/types/user";

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Resolves an internal Appwrite User Document by their Discord ID (Attribute).
   * This is the Single Source of Truth for ID Resolution.
   * @param discordId The Discord Snowflake ID
   * @throws Error if user not found (caller must handle)
   */
  async getByDiscordId(discordId: string): Promise<User> {
    const user = await this.userRepository.findByDiscordId(discordId);

    if (!user) {
      throw new Error(`User with Discord ID ${discordId} not found.`);
    }

    return user;
  }

  /**
   * Resolves an internal Appwrite User Document by their Auth ID.
   */
  async getByAuthId(authId: string): Promise<User> {
    const user = await this.userRepository.findByAuthId(authId);

    if (!user) {
      throw new Error(`User with Auth ID ${authId} not found.`);
    }

    return user;
  }
}
