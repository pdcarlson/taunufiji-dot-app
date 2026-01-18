"use server";

import { AuthService } from "@/lib/services/auth.service";
import { logger } from "@/lib/logger";

export async function syncUserAction(authId: string) {
  try {
    await AuthService.syncUser(authId);
    logger.log(`SyncUser Success for ${authId}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    logger.error(`SyncUser Failed: ${msg}`);
    // Don't throw, just log. We don't want to crash the dashboard if sync fails momentarily.
  }
}

export async function getProfileAction(authId: string) {
  try {
    // Attempt to Sync (Create/Update) User
    // ALERTS: This performs a write operation and hits the Discord API.
    const profile = await AuthService.syncUser(authId);
    return JSON.parse(JSON.stringify(profile));
  } catch (e) {
    logger.error(`Sync User Failed for ${authId}`, e);

    // Fallback: Try to just READ the profile if it exists
    // This handles cases where Discord API is down but user exists in DB
    try {
      const profile = await AuthService.getProfile(authId);
      if (profile) {
        return JSON.parse(JSON.stringify(profile));
      }
    } catch (readError) {
      logger.error(`Fallback GetProfile Failed for ${authId}`, readError);
    }

    return null;
  }
}
