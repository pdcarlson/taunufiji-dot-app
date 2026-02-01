"use server";

import { AuthService } from "@/lib/application/services/auth.service";
import { getContainer } from "@/lib/infrastructure/container";
import { logger } from "@/lib/utils/logger";

export async function syncUserAction(authId: string) {
  try {
    const { authService } = getContainer();
    await authService.syncUser(authId);
    logger.log(`SyncUser Success for ${authId}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    logger.error(`SyncUser Failed: ${msg}`);
    // Don't throw, just log. We don't want to crash the dashboard if sync fails momentarily.
  }
}

export async function getProfileAction(authId: string) {
  try {
    const { authService } = getContainer();

    // Attempt to Sync (Create/Update) User
    // ALERTS: This performs a write operation and hits the Discord API.
    const profile = await authService.syncUser(authId);

    // Check Authorization (Brother Role)
    const isAuthorized = await authService.verifyBrother(authId);

    if (process.env.NODE_ENV === "development") {
      logger.log(`[getProfileAction] ${authId} -> Authorized: ${isAuthorized}`);
    }

    // Return Profile + Auth Status
    return {
      ...JSON.parse(JSON.stringify(profile)),
      isAuthorized,
    };
  } catch (e) {
    logger.error(`Sync User Failed for ${authId}`, e);

    // Fallback: Try to just READ the profile if it exists
    // This handles cases where Discord API is down but user exists in DB
    try {
      const { authService } = getContainer();
      const profile = await authService.getProfile(authId);
      if (profile) {
        // If we fallback, we still need to verify authorization if possible.
        // However, verifyBrother also hits Discord API.
        // If syncUser failed due to Discord API, verifyBrother likely will too.
        // We'll default to FALSE if we can't verify, or try one more time.
        let isAuthorized = false;
        try {
          isAuthorized = await authService.verifyBrother(authId);
        } catch (verifyError) {
          logger.error(
            `Fallback VerifyBrother Failed for ${authId}`,
            verifyError,
          );
        }

        return {
          ...JSON.parse(JSON.stringify(profile)),
          isAuthorized,
        };
      }
    } catch (readError) {
      logger.error(`Fallback GetProfile Failed for ${authId}`, readError);
    }

    return null;
  }
}
