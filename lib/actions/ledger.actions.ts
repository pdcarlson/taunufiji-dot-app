"use server";

import { PointsService } from "@/lib/services/points.service";
import { createSessionClient, createJWTClient } from "@/lib/server/appwrite";
import { AuthService } from "@/lib/services/auth.service";

async function getAuthAccount(jwt?: string) {
  if (jwt) {
    return createJWTClient(jwt).account;
  }
  const { account } = await createSessionClient();
  return account;
}

export async function getTransactionHistoryAction(
  userId: string,
  jwt?: string
) {
  try {
    const account = await getAuthAccount(jwt);
    const session = await account.get();

    if (!session || session.$id !== userId) {
      // Only allow viewing OWN history for now.
      // If admins need access, we check roles.
      // But for "My Points", strictly enforce.
      throw new Error("Unauthorized access to ledger");
    }

    const profile = await AuthService.getProfile(userId);
    if (!profile) return [];

    const res = await PointsService.getHistory(profile.$id);
    return JSON.parse(JSON.stringify(res.documents));
  } catch (error) {
    console.error("Failed to fetch history", error);
    return [];
  }
}
