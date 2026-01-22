import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Client, Databases, Query } from "node-appwrite";
import { DB_ID, COLLECTIONS } from "../lib/types/schema";
import { env } from "../lib/config/env";

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY!);

const db = new Databases(client);

async function migrate() {
  console.log("🚀 Starting Schema Migration: reminded -> notification_level");

  // 1. Fetch all assignments
  let allTasks: any[] = [];
  let cursor = null;

  do {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const res = await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, queries);
    allTasks.push(...res.documents);

    if (res.documents.length < 100) break;
    cursor = res.documents[res.documents.length - 1].$id;
  } while (true);

  console.log(`Found ${allTasks.length} tasks to check.`);

  // 2. Add 'notification_level' Attribute (if not exists)
  // Note: We can't easily check schema via API without specific endpoint,
  // but we can try creating it. If it fails (exists), we ignore.
  try {
    console.log("Creating 'notification_level' string attribute...");
    await db.createStringAttribute(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      "notification_level",
      32,
      false,
      "none",
    );
    // Wait for attribute to be available? Usually takes a moment.
    console.log("Waiting for attribute creation...");
    await new Promise((r) => setTimeout(r, 5000));
  } catch (e: any) {
    if (e.message.includes("already exists")) {
      console.log("'notification_level' attribute already exists. Proceeding.");
    } else {
      console.error("Failed to create attribute:", e);
      // return; // Don't return, maybe we just need to migrate data
    }
  }

  // 3. Migrate Data
  let updated = 0;
  for (const task of allTasks) {
    const isReminded = task.reminded === true;
    const currentLevel = task.notification_level;

    // Determine new level
    // If already has a level, skip (unless we want to overwrite legacy)
    if (currentLevel && currentLevel !== "none") continue;

    const newLevel = isReminded ? "halfway" : "none";

    if (newLevel !== "none") {
      try {
        await db.updateDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, task.$id, {
          notification_level: newLevel,
        });
        updated++;
        process.stdout.write(".");
      } catch (e) {
        console.error(`\nFailed to update ${task.$id}:`, e);
      }
    }
  }

  console.log(`\n\n✅ Migration Complete.`);
  console.log(
    `Updated ${updated} tasks legacy 'reminded' to 'notification_level'.`,
  );

  // 4. (Optional) Delete 'reminded' attribute?
  // User asked to "Be very careful". Let's keep it for now as backup.
  console.log("Note: 'reminded' attribute preserved for safety.");
}

migrate();
