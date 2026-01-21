import { Client, Databases, ID } from "node-appwrite";
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
  console.log("=== COLLECTION RECONSTRUCTION TOOL ===");
  const COLL_ID = COLLECTIONS.USERS;
  const COLL_NAME = "Users";

  if (!process.env.APPWRITE_API_KEY) process.exit(1);

  // 1. DELETE COLLECTION
  console.log(`[1/5] Deleting Collection '${COLL_ID}'...`);
  try {
    await db.deleteCollection(DB_ID, COLL_ID);
    console.log("✅ Collection deleted.");
  } catch (e: any) {
    console.warn("⚠️ Delete failed (might not exist):", e.message);
  }

  // Wait for consistency
  await new Promise((r) => setTimeout(r, 3000));

  // 2. CREATE COLLECTION
  console.log(`[2/5] Creating Collection '${COLL_ID}'...`);
  try {
    await db.createCollection(DB_ID, COLL_ID, COLL_NAME);
    console.log("✅ Collection created.");
  } catch (e: any) {
    console.error("❌ CREATE FAILED:", e.message);
    process.exit(1);
  }

  // 3. DEFINE ATTRIBUTES
  console.log(`[3/5] Defining Attributes...`);
  try {
    // String Attributes
    await db.createStringAttribute(DB_ID, COLL_ID, "discord_id", 32, true); // Required
    await db.createStringAttribute(DB_ID, COLL_ID, "auth_id", 32, true); // Required
    await db.createStringAttribute(DB_ID, COLL_ID, "discord_handle", 64, true);
    await db.createStringAttribute(DB_ID, COLL_ID, "full_name", 128, true);
    await db.createStringAttribute(
      DB_ID,
      COLL_ID,
      "position_key",
      64,
      false,
      "none",
    ); // Optional, default none

    // Enum: status
    await db.createEnumAttribute(
      DB_ID,
      COLL_ID,
      "status",
      ["active", "alumni"],
      true,
    );

    // Int Attributes
    await db.createIntegerAttribute(
      DB_ID,
      COLL_ID,
      "details_points_current",
      false,
      0,
      1000000,
      0,
    );
    await db.createIntegerAttribute(
      DB_ID,
      COLL_ID,
      "details_points_lifetime",
      false,
      0,
      1000000,
      0,
    );

    console.log("✅ Attributes defined.");
  } catch (e: any) {
    console.error("❌ ATTRIBUTES FAILED:", e.message);
    // Continue? Might fail later.
  }

  // Wait for attributes to be processed (Appwrite is async)
  console.log("Waiting 5s for attributes to compile...");
  await new Promise((r) => setTimeout(r, 5000));

  // 4. CREATE INDEXES
  console.log(`[4/5] Creating Indexes...`);
  try {
    // Unique Discord ID
    await db.createIndex(DB_ID, COLL_ID, "discord_id_index", "unique", [
      "discord_id",
    ]);
    // Unique Auth ID
    await db.createIndex(DB_ID, COLL_ID, "auth_id_index", "unique", [
      "auth_id",
    ]);
    console.log("✅ Indexes created.");
  } catch (e: any) {
    console.warn("⚠️ Index creation warning:", e.message);
  }

  // Wait for indexes
  await new Promise((r) => setTimeout(r, 3000));

  // 5. RESTORE DATA
  console.log(`[5/5] Restoring Data form backup_users.json...`);
  try {
    if (fs.existsSync("backup_users.json")) {
      const raw = fs.readFileSync("backup_users.json", "utf-8");
      const users = JSON.parse(raw);

      for (const user of users) {
        console.log(` Restoring ${user.full_name}...`);
        await db.createDocument(
          DB_ID,
          COLL_ID,
          ID.unique(), // NEW RANDOM ID
          {
            discord_id: user.discord_id,
            auth_id: user.auth_id,
            discord_handle: user.discord_handle,
            full_name: user.full_name,
            status: user.status || "active",
            details_points_current: user.details_points_current || 0,
            details_points_lifetime: user.details_points_lifetime || 0,
            position_key: "none", // Reset position_key to safe default
          },
        );
      }
      console.log("✅ Restoration Complete.");
    } else {
      console.log("No backup file found. Collection created empty.");
    }
  } catch (e: any) {
    console.error("❌ RESTORE FAILED:", e.message);
  }

  console.log("\n=== DONE ===");
}

main();
