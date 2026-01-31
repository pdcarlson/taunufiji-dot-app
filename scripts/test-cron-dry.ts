/**
 * Dry-Run Cron Audit Script
 *
 * Purpose: Simulates TasksService.runCron() logic without making DB mutations.
 * This allows us to verify:
 * - Unlock logic (locked -> open)
 * - Halfway notifications
 * - Bounty expiry (claimed -> unclaimed)
 * - Duty expiry (open -> expired + fine)
 *
 * Usage: npx tsx scripts/test-cron-dry.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Client, Databases, Query } from "node-appwrite";
import { env } from "@/lib/infrastructure/config/env";
import { DB_ID, COLLECTIONS } from "@/lib/types/schema";
import { HousingTask } from "@/lib/types/models";

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY!);

const db = new Databases(client);

async function auditCron() {
  console.log("🔍 Starting Cron Audit (Dry Run)\n");
  const now = new Date();
  console.log(`📅 Current Time: ${now.toISOString()}\n`);

  const results = {
    toUnlock: [] as any[],
    toNotifyHalfway: [] as any[],
    toExpireBounty: [] as any[],
    toExpireDuty: [] as any[],
  };

  // 1. unlock tasks (locked -> open)
  console.log("=== 1. UNLOCK TASKS ===");
  try {
    const lockedTasks = await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
      Query.equal("status", "locked"),
      Query.lessThanEqual("unlock_at", now.toISOString()),
    ]);

    console.log(`Found ${lockedTasks.total} locked tasks to unlock:`);
    lockedTasks.documents.forEach((doc) => {
      const task = doc as unknown as HousingTask;
      console.log(
        `  - [${task.$id}] "${task.title}" (unlock_at: ${task.unlock_at})`,
      );
      results.toUnlock.push({
        id: task.$id,
        title: task.title,
        assigned_to: task.assigned_to,
        unlock_at: task.unlock_at,
      });
    });
  } catch (e) {
    console.error("❌ Unlock check failed:", e);
  }

  // 2. halfway notifications
  console.log("\n=== 2. HALFWAY NOTIFICATIONS ===");
  try {
    const openTasks = await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
      Query.equal("status", "open"),
      Query.notEqual("notification_level", "halfway"),
      Query.notEqual("notification_level", "urgent"),
      Query.limit(100),
    ]);

    console.log(`Checking ${openTasks.total} open tasks for halfway point:`);
    openTasks.documents.forEach((doc) => {
      const task = doc as unknown as HousingTask;
      if (!task.assigned_to || !task.due_at) return;

      const startTime = task.unlock_at
        ? new Date(task.unlock_at).getTime()
        : new Date(task.$createdAt).getTime();
      const dueTime = new Date(task.due_at).getTime();
      const duration = dueTime - startTime;

      if (duration <= 0) return;

      const halfwayPoint = startTime + duration / 2;

      if (now.getTime() > halfwayPoint) {
        console.log(
          `  - [${task.$id}] "${task.title}" (assignee: ${task.assigned_to})`,
        );
        results.toNotifyHalfway.push({
          id: task.$id,
          title: task.title,
          assigned_to: task.assigned_to,
          halfway_time: new Date(halfwayPoint).toISOString(),
        });
      }
    });
    console.log(
      `${results.toNotifyHalfway.length} tasks ready for halfway notification`,
    );
  } catch (e) {
    console.error("❌ Halfway check failed:", e);
  }

  // 3. expire bounties (claimed but overdue)
  console.log("\n=== 3. EXPIRE BOUNTIES ===");
  try {
    const claimedBounties = await db.listDocuments(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      [
        Query.equal("type", "bounty"),
        Query.notEqual("status", "open"),
        Query.lessThanEqual("due_at", now.toISOString()),
        Query.limit(100),
      ],
    );

    console.log(`Found ${claimedBounties.total} overdue bounties:`);
    claimedBounties.documents.forEach((doc) => {
      const task = doc as unknown as HousingTask;
      console.log(
        `  - [${task.$id}] "${task.title}" (due: ${task.due_at}, claimant: ${task.assigned_to})`,
      );
      results.toExpireBounty.push({
        id: task.$id,
        title: task.title,
        assigned_to: task.assigned_to,
        due_at: task.due_at,
      });
    });
  } catch (e) {
    console.error("❌ Bounty expiry check failed:", e);
  }

  // 4. expire duties (open + overdue)
  console.log("\n=== 4. EXPIRE DUTIES (FINE) ===");
  try {
    const overdueDuties = await db.listDocuments(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      [
        Query.equal("status", "open"),
        Query.lessThanEqual("due_at", now.toISOString()),
        Query.limit(100),
      ],
    );

    console.log(`Found ${overdueDuties.total} overdue open tasks:`);
    overdueDuties.documents.forEach((doc) => {
      const task = doc as unknown as HousingTask;
      // filter out bounties
      if (task.type === "bounty" || task.type === "project") return;

      console.log(
        `  - [${task.$id}] "${task.title}" (due: ${task.due_at}, assignee: ${task.assigned_to})`,
      );
      results.toExpireDuty.push({
        id: task.$id,
        title: task.title,
        assigned_to: task.assigned_to,
        due_at: task.due_at,
        schedule_id: task.schedule_id,
      });
    });
    console.log(
      `${results.toExpireDuty.length} duties would be expired and fined`,
    );
  } catch (e) {
    console.error("❌ Duty expiry check failed:", e);
  }

  // summary
  console.log("\n=== AUDIT SUMMARY ===");
  console.log(`✅ Tasks to unlock: ${results.toUnlock.length}`);
  console.log(
    `⏳ Tasks to notify (halfway): ${results.toNotifyHalfway.length}`,
  );
  console.log(`💰 Bounties to unclaim: ${results.toExpireBounty.length}`);
  console.log(`🚨 Duties to expire & fine: ${results.toExpireDuty.length}`);

  console.log("\n📊 Detailed Results:");
  console.log(JSON.stringify(results, null, 2));

  console.log("\n✅ Audit complete. No changes were made to the database.");
}

auditCron().catch((e) => {
  console.error("Fatal error during audit:", e);
  process.exit(1);
});
