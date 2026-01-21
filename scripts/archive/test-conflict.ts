import { Client, Databases, ID } from "node-appwrite";
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
  console.log("=== CONFLICT DIAGNOSTIC ===");
  const TARGET_DISCORD_ID = "750146095291564095";
  const TARGET_AUTH_ID = "697078cde7ee0533277f";

  if (!process.env.APPWRITE_API_KEY) {
    console.error("ERROR: APPWRITE_API_KEY is not set.");
    process.exit(1);
  }

  // TEST A: Is AUTH ID the problem?
  console.log("\n[TEST A] Checking AUTH ID Conflict...");
  try {
    const docA = await db.createDocument(
      DB_ID,
      COLLECTIONS.USERS,
      ID.unique(),
      {
        auth_id: TARGET_AUTH_ID, // Use real Auth ID
        discord_id: "random_" + ID.unique(), // Random Discord
        discord_handle: "TestA",
        full_name: "Test A",
        status: "active",
        details_points_current: 0,
        details_points_lifetime: 0,
      },
    );
    console.log("✅ TEST A PASSED: Auth ID is FREE.");
    await db.deleteDocument(DB_ID, COLLECTIONS.USERS, docA.$id);
  } catch (e: any) {
    console.error("❌ TEST A FAILED (Auth ID Conflict):", e.message);
  }

  // TEST B: Is DISCORD ID the problem?
  console.log("\n[TEST B] Checking DISCORD ID Conflict...");
  try {
    const docB = await db.createDocument(
      DB_ID,
      COLLECTIONS.USERS,
      ID.unique(),
      {
        auth_id: "random_" + ID.unique(), // Random Auth
        discord_id: TARGET_DISCORD_ID, // Use real Discord ID
        discord_handle: "TestB",
        full_name: "Test B",
        status: "active",
        details_points_current: 0,
        details_points_lifetime: 0,
      },
    );
    console.log("✅ TEST B PASSED: Discord ID is FREE.");
    await db.deleteDocument(DB_ID, COLLECTIONS.USERS, docB.$id);
  } catch (e: any) {
    console.error("❌ TEST B FAILED (Discord ID Conflict):", e.message);
  }
}

main();
