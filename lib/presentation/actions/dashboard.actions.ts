"use server";

import { createSessionClient } from "@/lib/presentation/server/appwrite";

import { TasksService } from "@/lib/application/services/tasks.service";
import { AuthService } from "@/lib/application/services/auth.service";
import { LibraryService } from "@/lib/application/services/library.service";
import { logger } from "@/lib/utils/logger";
import { Client, Databases, Query } from "node-appwrite";
import { env } from "@/lib/infrastructure/config/env";
import { DB_ID, COLLECTIONS } from "@/lib/domain/entities/schema";

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY!);

const db = new Databases(client);

import { DashboardStats } from "@/lib/domain/entities/dashboard";

export async function getDashboardStatsAction(
  userId: string,
): Promise<DashboardStats> {
  try {
    // 1. Authorization Guard
    const isAuthorized = await AuthService.verifyBrother(userId);
    if (!isAuthorized) {
      // Return empty/safe status if unauthorized (fail secure)
      return {
        points: 0,
        activeTasks: 0,
        pendingReviews: 0,
        fullName: "Brother",
        housingHistory: [],
        libraryHistory: [],
      };
    }

    // 2. Get My Tasks (active)
    // 2. Get My Tasks (active)
    // Ensure we query by Profile ID, not Auth ID
    const profile = await AuthService.getProfile(userId);

    // <--- KEY FIX: Use discord_id (Stable) instead of $id (Random after migration)
    let activeCount = 0;
    if (profile) {
      const myTasksRes = await TasksService.getMyTasks(profile.discord_id);
      if (myTasksRes && Array.isArray(myTasksRes.documents)) {
        activeCount = myTasksRes.documents.filter(
          (d: any) =>
            d.status === "pending" ||
            d.status === "open" ||
            d.status === "rejected",
        ).length;
      }
    }

    // const myTasks = await TasksService.getMyTasks(userId);
    // const activeCount = myTasks.documents.filter(d => d.status === "pending" || d.status === "open").length;

    // 2. Get Pending Reviews (for Admins - Housing Chair etc.)
    // This is expensive if we don't have a specific query.
    // Assuming 'pending' status means 'needs review' if proof is attached.
    // Or if status is 'pending_review' (need to verify schema).
    // For now, let's just get All Open/Pending tasks count or mock it if we can't filter easily.
    // Logically: TasksService.getOpenTasks() returns "open" tasks.
    // TasksService.claimTask sets status="pending".
    // So "pending" tasks are the ones to review? Or are they just claimed?
    // Let's assume 'pending' counts as active for user, and maybe pending reviews are distinct.
    // Based on public-site: `t.status === "pending_review"`.
    // So we should check for "pending_review".

    // Let's try to get pending reviews count.
    // We'll expose a method in TasksService later if needed.
    const pendingReviewsCount = 0; // Placeholder until mapped correctly to schema

    // 3. Get Points (Real)
    // Note: DB Documents are keyed by Discord ID, but we have Auth ID.
    // We must query by auth_id.
    const userDocs = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.equal("auth_id", userId),
      Query.limit(1),
    ]);

    const userDoc = userDocs.documents[0];

    if (!userDoc) {
      return {
        points: 0,
        activeTasks: activeCount,
        pendingReviews: 0,
        fullName: "Brother",
        housingHistory: [],
        libraryHistory: [],
      };
    }

    // 4. Get Recent History (Last 3)
    // 4. Get Distributed History
    let housingHistory: any[] = [];
    let libraryHistory: any[] = [];

    try {
      // Parallel fetch for efficiency
      const [housingDocs, libraryDocs] = await Promise.all([
        db.listDocuments(DB_ID, COLLECTIONS.LEDGER, [
          Query.equal("user_id", userDoc.discord_id),
          // Housing uses Categories: 'task', 'fine' (and maybe 'manual' if related)
          Query.equal("category", ["task", "fine"]),
          Query.orderDesc("timestamp"),
          Query.limit(3),
        ]),
        db.listDocuments(DB_ID, COLLECTIONS.LEDGER, [
          Query.equal("user_id", userDoc.discord_id),
          // Library uses Category: 'event' (for uploads)
          Query.equal("category", "event"),
          Query.orderDesc("timestamp"),
          Query.limit(3),
        ]),
      ]);

      housingHistory = housingDocs.documents.map((d) => ({
        id: d.$id,
        reason: d.reason,
        amount: d.amount,
        category: d.category,
        timestamp: d.timestamp,
      }));

      libraryHistory = libraryDocs.documents.map((d) => ({
        id: d.$id,
        reason: d.reason,
        amount: d.amount,
        category: d.category,
        timestamp: d.timestamp,
      }));
    } catch (err) {
      console.warn("Failed to fetch distributed history", err);
    }

    return {
      points: userDoc.details_points_current || 0,
      activeTasks: activeCount,
      pendingReviews: pendingReviewsCount,
      fullName: userDoc.full_name || "Brother",
      housingHistory,
      libraryHistory,
    };
  } catch (e: unknown) {
    logger.error("getDashboardStatsAction Failed", e);
    return {
      points: 0,
      activeTasks: 0,
      pendingReviews: 0,
      fullName: "Brother",
      housingHistory: [],
      libraryHistory: [],
    };
  }
}

export async function getLeaderboardAction(userId?: string) {
  try {
    // Session Verification is flaky on some setups (Cookie issues).
    // Failing gracefully or using Admin Client logic if userId is provided.

    // If we have a userId, verify role using Admin Client
    if (userId) {
      const isAuthorized = await AuthService.verifyBrother(userId);
      if (!isAuthorized) {
        return [];
      }
    } else {
      // Fallback: Try Session Client (Strict mode)
      // If this fails (No session), we return empty to be safe
      try {
        const { account } = await createSessionClient();
        const user = await account.get();
        if (!(await AuthService.verifyBrother(user.$id))) {
          return [];
        }
      } catch (sessionError) {
        console.warn("Leaderboard: No session and no userId provided.");
        return [];
      }
    }

    const res = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.orderDesc("details_points_current"),
      Query.limit(5),
      Query.select(["full_name", "details_points_current", "discord_handle"]),
    ]);

    return res.documents.map((doc, i) => ({
      id: doc.$id,
      name: doc.full_name || doc.discord_handle || "Unknown",
      points: doc.details_points_current || 0,
      rank: i + 1,
    }));
  } catch (e) {
    logger.error("Leaderboard fetch failed", e);
    return [];
  }
}

export async function getMyRankAction(userId: string) {
  try {
    // Use Admin Client (db) directly since we verify authorization manually below.
    // This avoids "No session" errors if cookies are flaky.

    // 1. Authorization Guard
    // Note: userId here might be Document ID (Random) OR Discord ID (Legacy/Client logic).
    // We need to fetch the document either way.

    let userDoc;
    try {
      // Try as Document ID first
      userDoc = await db.getDocument(DB_ID, COLLECTIONS.USERS, userId);
    } catch {
      // Try as Discord ID (Attribute)
      // This handles cases where the client passes profile.discord_id or thinks ID is Discord ID
      const list = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
        Query.equal("discord_id", userId),
        Query.limit(1),
      ]);
      userDoc = list.documents[0];
    }

    if (!userDoc) {
      console.warn(`[getMyRank] User not found for ID: ${userId}`);
      return null;
    }

    // Verify using Auth ID attached to the profile
    const isAuthorized = await AuthService.verifyBrother(userDoc.auth_id);
    if (!isAuthorized) {
      return null;
    }

    const myPoints = userDoc.details_points_current || 0;

    // Count users with strictly more points
    const betterPlayers = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.greaterThan("details_points_current", myPoints),
      Query.limit(1), // We only need count, but 'total' is what matters
    ]);

    // Query.limit(1) with total gives us the count of matches?
    // Wait, createSessionClient was doing 'account.get()' which returns the Auth User.
    // If we use Admin, we trust 'userId' (Profile ID).

    const rank = betterPlayers.total + 1;

    return {
      rank,
      points: myPoints,
    };
  } catch (e) {
    logger.error("My Rank fetch failed", e);
    return null;
  }
}
