"use server";

import { createJWTClient } from "@/lib/presentation/server/appwrite";
import { getContainer } from "@/lib/infrastructure/container";
import { logger } from "@/lib/utils/logger";
import { HousingTask } from "@/lib/domain/types/task";

export async function getMyTasksAction(jwt: string) {
  try {
    const { dutyService, authService } = getContainer();

    // 1. Verify Identity
    const { account } = createJWTClient(jwt);
    const user = await account.get();
    const userId = user.$id;

    // 2. Authorization
    const isAuthorized = await authService.verifyBrother(userId);
    if (!isAuthorized) {
      return { documents: [], total: 0 };
    }

    // 3. Resolve Profile for Discord ID
    const profile = await authService.getProfile(userId);
    if (!profile) return { documents: [], total: 0 };

    // 4. Fetch Tasks
    const result = await dutyService.getMyTasks(profile.discord_id);

    // Serialization for Client
    return JSON.parse(JSON.stringify(result));
  } catch (e) {
    logger.error("getMyTasksAction Failed", e);
    return { documents: [], total: 0 };
  }
}
