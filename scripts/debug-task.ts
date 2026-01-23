import { Client, Databases, Query } from "node-appwrite";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
const envPath = path.resolve(process.cwd(), ".env.production");
dotenv.config({ path: envPath });
if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
}

// Manually setup Appwrite
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "")
  .setKey(process.env.APPWRITE_API_KEY || "");

const db = new Databases(client);
const DB_ID = "v2_internal_ops";
const COLLECTIONS = {
  ASSIGNMENTS: "assignments",
};

console.log("⚙️  Appwrite Configuration:");
console.log(`   Endpoint: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}`);
console.log(`   Project: ${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`);
console.log(`   Database: ${DB_ID}`);
console.log(`   Collection: ${COLLECTIONS.ASSIGNMENTS}`);
console.log(`   API Key: ${!!process.env.APPWRITE_API_KEY}\n`);

async function debugTask() {
  console.log("🔍 Hunting for Stuck Urgent Candidates...\n");
  const now = new Date();
  const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  // Replicate the exact query from tasks.service.ts
  const stuckTasks = await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
    Query.equal("status", "open"),
    Query.equal("notification_level", "unlocked"),
    Query.lessThanEqual("due_at", twelveHoursFromNow.toISOString()),
    Query.limit(10),
  ]);

  if (stuckTasks.documents.length === 0) {
    console.log("✅ No stuck urgent candidates found. (This is good!)");
  } else {
    console.log(
      `❌ Found ${stuckTasks.documents.length} stuck tasks! These will trigger duplicate pings:\n`,
    );
    stuckTasks.documents.forEach((t) => {
      console.log(`   - [${t.$id}] ${t.title} (Due: ${t.due_at})`);
    });
  }

  console.log("\n🔍 Hunting for Overdue Open Tasks (Missed Expiry)...\n");
  const overdueTasks = await db.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [
    Query.equal("status", "open"),
    Query.lessThanEqual("due_at", now.toISOString()),
    Query.limit(10),
  ]);

  if (overdueTasks.documents.length === 0) {
    console.log(
      "✅ No overdue open tasks found. (Cron is expiring them correctly)",
    );
  } else {
    console.log(
      `❌ Found ${overdueTasks.documents.length} overdue open tasks! Cron is failing to expire them:\n`,
    );
    overdueTasks.documents.forEach((t) => {
      console.log(`   - [${t.$id}] ${t.title} (Due: ${t.due_at})`);
    });
  }
}

debugTask()
  .then(() => {
    console.log("\n✅ Debug complete");
    process.exit(0);
  })
  .catch((e) => {
    console.error("\n❌ Debug failed:", e);
    process.exit(1);
  });
