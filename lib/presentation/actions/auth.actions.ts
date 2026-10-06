"use server";

import { env } from "@/lib/infrastructure/config/env";
import { actionWrapper } from "@/lib/presentation/utils/action-handler";
import { logger } from "@/lib/utils/logger";
import { HOUSING_ADMIN_ROLES } from "@/lib/infrastructure/config/roles";

export async function getProfileAction(jwt: string) {
  const result = await actionWrapper(
    async ({ container, userId }) => {
      // Check access before syncing so people without the access role never
      // get a profile row.
      const isAuthorized = await container.authService.verifyBrother(userId);

      if (env.NODE_ENV === "development") {
        logger.log(
          `[getProfileAction] ${userId} -> Authorized: ${isAuthorized}`,
        );
      }

      if (!isAuthorized) {
        return { isAuthorized };
      }

      // Use the ID from the JWT (secure), never a client-passed ID.
      const profile = await container.authService.syncUser(userId);

      return {
        ...JSON.parse(JSON.stringify(profile)),
        isAuthorized,
      };
    },
    { jwt, public: true }, // public: true skips the default Brother Check, allowing us to return isAuthorized: false
  );

  if (result.success && result.data) return result.data;
  return null;
}

/**
 * Check if the current user has Housing Admin privileges.
 */
export async function checkHousingAdminAction(jwt: string): Promise<boolean> {
  const result = await actionWrapper(
    async ({ container, userId }) => {
      return await container.authService.verifyRole(
        userId,
        HOUSING_ADMIN_ROLES.map((r) => r as string),
      );
    },
    { jwt, public: true }, // We just want boolean result, don't throw
  );

  return result.success && (result.data ?? false);
}
