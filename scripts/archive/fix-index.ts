import { Client, Databases } from "node-appwrite";
import { env } from "../lib/config/env";
import { DB_ID, COLLECTIONS } from "../lib/types/schema";

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
  console.log("=== APPWRITE INDEX REPAIR TOOL ===");
  const INDEX_KEY = "discord_id_index";

  if (!process.env.APPWRITE_API_KEY) {
    console.error("ERROR: APPWRITE_API_KEY is not set.");
    process.exit(1);
  }

  try {
    // 1. Delete Index
    console.log(`[1/2] Deleting index '${INDEX_KEY}'...`);
    try {
      await db.deleteIndex(DB_ID, COLLECTIONS.USERS, INDEX_KEY);
      console.log("✅ Index deleted.");
    } catch (err: any) {
      console.warn("⚠️ Delete failed (might not exist):", err.message);
    }

    // Wait a moment for consistency (Appwrite might be async internal)
    await new Promise((r) => setTimeout(r, 2000));

    // 2. Recreate Index
    console.log(`[2/2] Recreating index '${INDEX_KEY}'...`);
    // createIndex(databaseId, collectionId, key, type, attributes, orders)
    // type: "unique", attributes: ["discord_id"], orders: ["ASC"] (optional but good practice)
    await db.createIndex(
      DB_ID,
      COLLECTIONS.USERS,
      INDEX_KEY,
      "unique",
      ["discord_id"],
      ["ASC"],
    );

    console.log("✅ SUCCESS: Index repaired. Ghost entries cleared.");
  } catch (err: any) {
    console.error("❌ REPAIR FAILED:", err.message);
  }
}

main();
