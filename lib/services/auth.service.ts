import { Client, Account, Users, Databases, Query, ID } from "node-appwrite";
import { env } from "../config/env";
import { DB_ID, COLLECTIONS } from "../types/schema";
import { ROLES, LIBRARY_ACCESS_ROLES } from "../config/roles";

// Server-side Client (Admin)
if (!env.APPWRITE_API_KEY) {
  console.error(
    "CRITICAL: APPWRITE_API_KEY is missing. AuthService will fail.",
  );
  // We don't throw immediately to allow build time, but runtime will crash on first call
}

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY || ""); // Fallback to empty string if missing (will cause 401)

const usersArgs = new Users(client);
const db = new Databases(client);

// Discord API Helpers
const DISCORD_API = "https://discord.com/api/v10";
// Removed top-level constants to allow runtime env injection (testing)

const CACHE = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60 * 1000; // 60 Seconds

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
  } catch (e) {
    console.error("Discord Fetch Error", e);
    if (cached) return cached.data; // Fallback to stale
    return null;
  }
}

export const AuthService = {
  /**
   * Syncs Discord Identity to Internal User Profile.
   */
  async syncUser(authId: string) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[AuthService] Starting syncUser for ${authId}`);
    }

    // 1. Get Auth Account
    const identities = await usersArgs.listIdentities([
      Query.equal("userId", authId),
    ]);
    const discord = identities.identities.find((i) => i.provider === "discord");

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
      await usersArgs.updateName(authId, fullName);
    } catch (e) {
      console.warn("Failed to update Appwrite Auth Name", e);
    }

    // 3. Check DB
    const list = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.equal("discord_id", discord.providerUid),
    ]);

    if (list.documents.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AuthService] User not found (by Discord ID). Creating new profile...`,
        );
      }

      // Standard Creation Flow: Use Random ID and store Discord ID as attribute
      try {
        return await db.createDocument(
          DB_ID,
          COLLECTIONS.USERS,
          ID.unique(), // <--- KEY CHANGE: Standard Random ID
          {
            auth_id: authId,
            discord_id: discord.providerUid,
            discord_handle: discordHandle,
            full_name: fullName,
            // position_key: "none",
            status: "active",
            details_points_current: 0,
            details_points_lifetime: 0,
          },
        );
      } catch (createError: any) {
        // Double Check: Did we conflict on a Unique Attribute (discord_id)?
        if (createError?.code === 409) {
          console.warn(
            "[AuthService] Creation Conflict (409). Checking if user exists...",
          );

          // 1. Check by Discord ID Attribute (The likely conflict)
          const existingByDiscord = await db.listDocuments(
            DB_ID,
            COLLECTIONS.USERS,
            [Query.equal("discord_id", discord.providerUid)],
          );
          if (existingByDiscord.total > 0) {
            console.log("[AuthService] Recovered existing user by Discord ID.");
            return existingByDiscord.documents[0];
          }

          // 2. Check by Auth ID
          const existingByAuth = await db.listDocuments(
            DB_ID,
            COLLECTIONS.USERS,
            [Query.equal("auth_id", authId)],
          );
          if (existingByAuth.total > 0) {
            console.log("[AuthService] Recovered existing user by Auth ID.");
            return existingByAuth.documents[0];
          }
        }

        // If we are here, it's a real mystery error or persistent unique index corruption
        console.error("[AuthService] Sync Failed completely.", createError);
        throw createError;
      }
    } else {
      // Update Metadata on Login (Existing User)
      const doc = list.documents[0];
      const updates: any = {};

      if (doc.discord_handle !== discordHandle || doc.full_name !== fullName) {
        updates.discord_handle = discordHandle;
        updates.full_name = fullName;
      }

      // SELF-REPAIR: Fix Auth ID Mismatch
      // If the stored auth_id doesn't match the current one (e.g. fresh login/account switch), update it.
      if (doc.auth_id !== authId) {
        console.warn(
          `[AuthService] Repairing Auth ID for ${doc.discord_handle}. Old: ${doc.auth_id}, New: ${authId}`,
        );
        updates.auth_id = authId;
      }

      if (Object.keys(updates).length > 0) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[AuthService] Updating user metadata:`, updates);
        }
        await db.updateDocument(DB_ID, COLLECTIONS.USERS, doc.$id, updates);
      }
      return doc;
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
      const identities = await usersArgs.listIdentities([
        Query.equal("userId", authId),
      ]);
      const discord = identities.identities.find(
        (i) => i.provider === "discord",
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
    } catch (e) {
      console.error("verifyRole Failed", e);
      return false;
    }
  },

  /**
   * Get Internal User Profile from Auth ID
   */
  async getProfile(authId: string) {
    // Query USERS collection by auth_id attribute
    const list = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.equal("auth_id", authId),
      Query.limit(1),
    ]);
    return list.documents[0] || null;
  },
};
