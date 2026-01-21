import { Client, Databases, ID, Query } from "node-appwrite";
import { env } from "../lib/config/env";
import { DB_ID, COLLECTIONS } from "../lib/types/schema";
import fs from "fs";

const client = new Client()
  .setEndpoint(
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      "https://appwrite.taunufiji.app/v1",
  )
  .setProject(
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "695ebb2e000e07f0f7a3",
  )
  .setKey(process.env.APPWRITE_API_KEY || "");

const db = new Databases(client);

async function main() {
  console.log("=== USER MIGRATION SURGEON ===");

  if (!process.env.APPWRITE_API_KEY) process.exit(1);

  try {
    console.log("[1/4] Checking State...");
    const dbList = await db.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.limit(100),
    ]);

    let usersToMigrate = dbList.documents;

    if (dbList.total === 0) {
      console.log("⚠️ Database is empty. Checking for backup...");
      if (fs.existsSync("backup_users.json")) {
        const data = fs.readFileSync("backup_users.json", "utf-8");
        usersToMigrate = JSON.parse(data);
        console.log(`✅ Loaded ${usersToMigrate.length} users from backup.`);
      } else {
        console.log("❌ No database users and No backup file. Cannot proceed.");
        return;
      }
    } else {
      console.log(`Found ${dbList.total} users in DB. Starting backup...`);
      fs.writeFileSync(
        "backup_users.json",
        JSON.stringify(dbList.documents, null, 2),
      );
      console.log("✅ Backup saved to backup_users.json");
    }

    // 2. WIPE & MIGRATE
    for (const user of usersToMigrate as any[]) {
      console.log(`\nMigrating User: ${user.full_name} ...`);

      // Delete Legacy (If it exists in DB)
      if (dbList.total > 0) {
        try {
          await db.deleteDocument(DB_ID, COLLECTIONS.USERS, user.$id);
          console.log("🗑️  Deleted legacy document.");
        } catch (e) {
          console.log("⚠️  Could not delete (already gone?):", e);
        }
      }

      // Restore with New ID
      // REMOVING 'position_key' because it caused schema error
      try {
        const newDoc = await db.createDocument(
          DB_ID,
          COLLECTIONS.USERS,
          ID.unique(),
          {
            auth_id: user.auth_id,
            discord_id: user.discord_id,
            discord_handle: user.discord_handle,
            full_name: user.full_name,
            status: user.status || "active",
            details_points_current: user.details_points_current || 0,
            details_points_lifetime: user.details_points_lifetime || 0,
            // REMOVED position_key
          },
        );
        console.log(`✨ Restored as ${newDoc.$id} (Random ID)`);
      } catch (createErr: any) {
        console.error("❌ Restore Failed:", createErr.message);
      }
    }

    console.log("\n✅ MIGRATION COMPLETE. The blockage should be cleared.");
  } catch (e: any) {
    console.error("❌ MIGRATION FAILED:", e.message);
    console.log("Restoration might be needed from backup_users.json");
  }
}

main();
