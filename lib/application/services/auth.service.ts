/**
 * Auth Service
 *
 * Handles authentication, Discord identity sync, and role verification.
 * Uses repository pattern for user data access where applicable.
 *
 * Note: getUsers() for identity lookups remains direct as there's no
 * identity repository - Appwrite Auth is a separate subsystem.
 */

import { Query, ID } from "node-appwrite";
import { getDatabase, getUsers } from "@/lib/infrastructure/persistence";
import { getContainer } from "@/lib/infrastructure/container";
import { DB_ID, COLLECTIONS } from "@/lib/domain/entities/schema";
import { LIBRARY_ACCESS_ROLES } from "@/lib/infrastructure/config/roles";
import type { UserSchema } from "@/lib/domain/entities/schema";

// Discord API Helpers
const DISCORD_API = "https://discord.com/api/v10";

const CACHE = new Map<string, { data: DiscordMember; expires: number }>();
const CACHE_TTL = 60 * 1000; // 60 Seconds

interface DiscordMember {
  user: {
    username: string;
    global_name?: string;
  };
  nick?: string;
  roles: string[];
}

async function getDiscordMember(discordUserId: string) {
  const GUILD_ID = process.env.DISCORD_GUILD_ID;
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  if (!GUILD_ID || !BOT_TOKEN) {
    console.error("Missing Discord Env Vars");
    return null;
  }

  // 1. Check Cache
  const now = Date.now();
  const cached = CACHE.get(discordUserId);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  try {
    const res = await fetch(
      `${DISCORD_API}/guilds/${GUILD_ID}/members/${discordUserId}`,
      {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
        next: { revalidate: 60 }, // Next.js Cache (Backup)
      },
    );

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      console.warn(`Discord Rate Limit! Retry after ${retryAfter}s`);
      // Return cached if available (stale-while-revalidate fallback)
      if (cached) return cached.data;
      return null;
    }

    if (!res.ok) {
      console.error(`Discord API Error: ${res.status} ${await res.text()}`);
      return null;
    }

    const data = await res.json();

    // 2. Set Cache
    CACHE.set(discordUserId, { data, expires: now + CACHE_TTL });

    return data;
  } catch (error: unknown) {
    console.error("Discord Fetch Error", error);
    if (cached) return cached.data; // Fallback to stale
    return null;
  }
}

export const AuthService = {
  /**
   * Syncs Discord Identity to Internal User Profile.
   * Note: Uses direct DB access for complex sync logic that doesn't
   * map cleanly to repository methods. This is acceptable for auth flows.
   */
  async syncUser(authId: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[AuthService] Starting syncUser for ${authId}`);
    }

    // 1. Get Auth Account (Must use direct Appwrite SDK - no repository for Auth)
    const users = getUsers();
    const db = getDatabase();
    const identities = await users.listIdentities([
      Query.equal("userId", authId),
    ]);
    const discord = identities.identities.find(
      (identity) => identity.provider === "discord",
    );

    if (!discord) throw new Error("No Discord Identity");

    // 2. Fetch Live Discord Data
    const member = await getDiscordMember(discord.providerUid);
    const discordHandle = member?.user.username || "Unknown";
    // Prefer Guild Nickname, then Global Name, then Username
    const fullName =
      member?.nick ||
      member?.user.global_name ||
      member?.user.username ||
      "Brother";

    // 2.5 Update Appwrite Auth Account Name (So client account.get() is correct)
    try {
      await users.updateName(authId, fullName);
    } catch (error: unknown) {
      console.warn("Failed to update Appwrite Auth Name", error);
    }

    // 3. Check DB for existing user
    const { userRepository } = getContainer();
    const existingUser = await userRepository.findByDiscordId(
      discord.providerUid,
    );

    if (!existingUser) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AuthService] User not found (by Discord ID). Creating new profile...`,
        );
      }

      // Standard Creation Flow: Use userRepository.create()
      try {
        return await userRepository.create({
          auth_id: authId,
          discord_id: discord.providerUid,
          discord_handle: discordHandle,
          full_name: fullName,
          status: "active",
          position_key: "",
          details_points_current: 0,
          details_points_lifetime: 0,
        });
      } catch (createError: unknown) {
        // Double Check: Did we conflict on a Unique Attribute (discord_id)?
        const errorWithCode = createError as { code?: number };
        if (errorWithCode?.code === 409) {
          console.warn(
            "[AuthService] Creation Conflict (409). Checking if user exists...",
          );

          // 1. Check by Discord ID Attribute (The likely conflict)
          const existingByDiscord = await userRepository.findByDiscordId(
            discord.providerUid,
          );
          if (existingByDiscord) {
            console.log("[AuthService] Recovered existing user by Discord ID.");
            return existingByDiscord;
          }

          // 2. Check by Auth ID
          const existingByAuth = await userRepository.findByAuthId(authId);
          if (existingByAuth) {
            console.log("[AuthService] Recovered existing user by Auth ID.");
            return existingByAuth;
          }
        }

        // If we are here, it's a real mystery error or persistent unique index corruption
        console.error("[AuthService] Sync Failed completely.", createError);
        throw createError;
      }
    } else {
      // Update Metadata on Login (Existing User)
      const updates: Partial<UserSchema> = {};

      if (
        existingUser.discord_handle !== discordHandle ||
        existingUser.full_name !== fullName
      ) {
        updates.discord_handle = discordHandle;
        updates.full_name = fullName;
      }

      // SELF-REPAIR: Fix Auth ID Mismatch
      if (existingUser.auth_id !== authId) {
        console.warn(
          `[AuthService] Repairing Auth ID for ${existingUser.discord_handle}. Old: ${existingUser.auth_id}, New: ${authId}`,
        );
        updates.auth_id = authId;
      }

      if (Object.keys(updates).length > 0) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[AuthService] Updating user metadata:`, updates);
        }
        await db.updateDocument(
          DB_ID,
          COLLECTIONS.USERS,
          existingUser.$id,
          updates,
        );
      }
      return existingUser;
    }
  },

  /**
   * Verifies if a user has access via Discord Roles (LIVE CHECK)
   */
  async verifyBrother(authId: string): Promise<boolean> {
    return this.verifyRole(
      authId,
      LIBRARY_ACCESS_ROLES.map((r) => r as string),
    );
  },

  /**
   * Verifies if a user has one of the specified roles
   */
  async verifyRole(authId: string, allowedRoles: string[]): Promise<boolean> {
    try {
      // 1. Get Discord User ID from Appwrite Identity
      const users = getUsers();
      const identities = await users.listIdentities([
        Query.equal("userId", authId),
      ]);
      const discord = identities.identities.find(
        (identity) => identity.provider === "discord",
      );

      if (!discord) {
        console.warn(`[AuthService] User ${authId} has no Discord Link.`);
        return false;
      }

      // 2. Call Discord API
      const member = await getDiscordMember(discord.providerUid);
      if (!member || !member.roles) {
        console.warn(
          `[AuthService] Could not fetch Discord Member for ${discord.providerUid}`,
        );
        return false;
      }

      const userRoles = member.roles as string[];

      // 3. Check intersection
      const hasAccess = userRoles.some((r) => allowedRoles.includes(r));

      if (!hasAccess) {
        console.warn(
          `[AuthService] verifyRole FAIL: User ${
            discord.providerUid
          } has roles [${userRoles.length}]. Needed: One of [${allowedRoles
            .map((r) => r.slice(-4))
            .join(", ")}...]`,
        );
      } else {
        console.log(
          `[AuthService] verifyRole PASS: User ${discord.providerUid}`,
        );
      }

      return hasAccess;
    } catch (error: unknown) {
      console.error("verifyRole Failed", error);
      return false;
    }
  },

  /**
   * Helper to get User Profile by Auth ID (Uses UserService)
   */
  async getProfile(authId: string) {
    const { userRepository } = getContainer();
    try {
      return await userRepository.findByAuthId(authId);
    } catch {
      return null;
    }
  },
};
