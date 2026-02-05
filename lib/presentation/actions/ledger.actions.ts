"use server";

import { createJWTClient } from "@/lib/presentation/server/appwrite";
import { getContainer } from "@/lib/infrastructure/container";

// Helper removed (single usage refactored inline)

export async function getTransactionHistoryAction(jwt: string) {
  try {
    const { account } = createJWTClient(jwt);
    const session = await account.get();
    const userId = session.$id;

    if (!session) {
      throw new Error("Unauthorized access to ledger");
    }

    const { pointsService, authService } = getContainer();

    // 3. Resolve Profile ID
    const profile = await authService.getProfile(userId);
    if (!profile) return [];

    const res = await pointsService.getHistory(profile.discord_id);
    return JSON.parse(JSON.stringify(res));
  } catch (error) {
    console.error("Failed to fetch history", error);
    return [];
  }
}
