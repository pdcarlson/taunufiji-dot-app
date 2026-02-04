"use server";

import { AuthService } from "@/lib/application/services/identity/auth.service";
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

/**
 * Check if the current user has Housing Admin privileges.
 * Verifies Discord roles against HOUSING_ADMIN_ROLES (Housing Chair, Cabinet, Dev).
 */
export async function checkHousingAdminAction(jwt: string): Promise<boolean> {
  try {
    const { authService } = getContainer();
    const { createJWTClient } =
      await import("@/lib/presentation/server/appwrite");
    const { HOUSING_ADMIN_ROLES } =
      await import("@/lib/infrastructure/config/roles");

    // 1. Verify JWT & get auth ID
    const client = createJWTClient(jwt);
    const account = client.account;
    const user = await account.get();
    const authId = user.$id;

    // 2. Check if user has any housing admin role
    return await authService.verifyRole(
      authId,
      HOUSING_ADMIN_ROLES.map((r) => r as string),
    );
  } catch (e) {
    logger.error(`checkHousingAdmin Failed`, e);
    return false;
  }
}
