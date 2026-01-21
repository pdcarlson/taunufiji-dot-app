import { Client, Databases, Query, Models } from "node-appwrite";
import { env } from "../config/env";
import { DB_ID, COLLECTIONS, UserSchema } from "../types/schema";

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY!);

const db = new Databases(client);

// Helper type merging Document with Schema
export type UserDocument = Models.Document & UserSchema;

export const UserService = {
  /**
   * Resolves an internal Appwrite User Document by their Discord ID (Attribute).
   * This is the Single Source of Truth for ID Resolution.
   * @param discordId The Discord Snowflake ID
   * @throws Error if user not found (caller must handle)
   */
  async getByDiscordId(discordId: string): Promise<UserDocument> {
    const list = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.equal("discord_id", discordId),
      Query.limit(1),
    ]);

    if (list.total === 0) {
      throw new Error(`User with Discord ID ${discordId} not found.`);
    }

    return list.documents[0] as unknown as UserDocument;
  },

  /**
   * Resolves an internal Appwrite User Document by their Auth ID.
   */
  async getByAuthId(authId: string): Promise<UserDocument> {
    const list = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.equal("auth_id", authId),
      Query.limit(1),
    ]);

    if (list.total === 0) {
      throw new Error(`User with Auth ID ${authId} not found.`);
    }

    return list.documents[0] as unknown as UserDocument;
  },
};
