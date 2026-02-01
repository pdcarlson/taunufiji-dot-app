/**
 * Auth Service
 *
 * Handles authentication, Discord identity sync, and role verification.
 * Uses repository pattern for user data access where applicable.
 *
 * Note: getUsers() for identity lookups remains direct as there's no
 * identity repository - Appwrite Auth is a separate subsystem.
 */

import { getDatabase } from "@/lib/infrastructure/persistence";
import { getContainer } from "@/lib/infrastructure/container";
import { DB_ID, COLLECTIONS } from "@/lib/domain/entities/appwrite.schema";
import { LIBRARY_ACCESS_ROLES } from "@/lib/infrastructure/config/roles";
import type { UserSchema } from "@/lib/domain/entities/appwrite.schema";

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
   * Now exclusively uses Repositories and Providers (Pure Application Logic).
   */
  async syncUser(authId: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[AuthService] Starting syncUser for ${authId}`);
    }

    const { identityProvider, userRepository } = getContainer();
    const db = getDatabase(); // Keep DB for updates, or move to Repo later. For now, focus on Identity.

    // 1. Get Discord Identity
    const discord = await identityProvider.getIdentity(authId, "discord");

    if (!discord) throw new Error("No Discord Identity");

    // 2. Fetch Live Discord Data
    const member = await getDiscordMember(discord.providerUid);
    const discordHandle = member?.user.username || "Unknown";
    const fullName =
      member?.nick ||
      member?.user.global_name ||
      member?.user.username ||
      "Brother";

    // 2.5 Update Auth Account Name
    await identityProvider.updateName(authId, fullName);

    // 3. Check DB for existing user
    const existingUser = await userRepository.findByDiscordId(
      discord.providerUid,
    );

    if (!existingUser) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AuthService] User not found (by Discord ID). Creating new profile...`,
        );
      }

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
        // ... (Error handling logic preserved, generic error typing mostly removed for brevity in this edit if unmodified)
        const errorWithCode = createError as { code?: number };
        if (errorWithCode?.code === 409) {
          // ... (Same Recovery Logic)
          const existingByDiscord = await userRepository.findByDiscordId(
            discord.providerUid,
          );
          if (existingByDiscord) return existingByDiscord;
          const existingByAuth = await userRepository.findByAuthId(authId);
          if (existingByAuth) return existingByAuth;
        }
        throw createError;
      }
    } else {
      // Update Metadata on Login
      const updates: Partial<UserSchema> = {};

      if (
        existingUser.discord_handle !== discordHandle ||
        existingUser.full_name !== fullName
      ) {
        updates.discord_handle = discordHandle;
        updates.full_name = fullName;
      }

      if (existingUser.auth_id !== authId) {
        updates.auth_id = authId;
      }

      if (Object.keys(updates).length > 0) {
        await userRepository.update(existingUser.$id, updates);
      }
      return existingUser;
    }
  },

  async verifyBrother(authId: string): Promise<boolean> {
    return this.verifyRole(
      authId,
      LIBRARY_ACCESS_ROLES.map((r) => r as string),
    );
  },

  async verifyRole(authId: string, allowedRoles: string[]): Promise<boolean> {
    try {
      const { identityProvider } = getContainer();

      // 1. Get Discord Identity
      const discord = await identityProvider.getIdentity(authId, "discord");

      if (!discord) {
        // console.warn(`[AuthService] User ${authId} has no Discord Link.`);
        return false;
      }

      // 2. Call Discord API
      const member = await getDiscordMember(discord.providerUid);
      if (!member || !member.roles) return false;

      // 3. Check intersection
      return member.roles.some((r: string) => allowedRoles.includes(r));
    } catch (error: unknown) {
      console.error("verifyRole Failed", error);
      return false;
    }
  },

  async getProfile(authId: string) {
    const { userRepository } = getContainer();
    try {
      return await userRepository.findByAuthId(authId);
    } catch {
      return null;
    }
  },
};
