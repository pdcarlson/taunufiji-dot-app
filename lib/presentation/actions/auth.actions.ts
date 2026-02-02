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

export async function getProfileAction(jwt: string) {
  try {
    const { authService } = getContainer();
    const { createJWTClient } =
      await import("@/lib/presentation/server/appwrite");

    // 1. Verify JWT & Identity
    const client = createJWTClient(jwt);
    const account = client.account;
    const user = await account.get();
    const authId = user.$id;

    // 2. Attempt to Sync (Create/Update) User
    // ALERTS: This performs a write operation and hits the Discord API.
    const profile = await authService.syncUser(authId);

    // 3. Check Authorization (Brother Role)
    const isAuthorized = await authService.verifyBrother(authId);

    if (process.env.NODE_ENV === "development") {
      logger.log(`[getProfileAction] ${authId} -> Authorized: ${isAuthorized}`);
    }

    // 4. Return Profile + Auth Status
    return {
      ...JSON.parse(JSON.stringify(profile)),
      isAuthorized,
    };
  } catch (e) {
    logger.error(`Sync User Failed`, e);
    // If JWT is invalid or sync fails, return null
    return null;
  }
}
