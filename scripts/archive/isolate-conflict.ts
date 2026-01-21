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
  console.log("=== ISOLATION CHAMBER ===");
  const TARGET_DISCORD = "750146095291564095";
  const TARGET_AUTH = "697078cde7ee0533277f";
  const TARGET_HANDLE = "PdCarlson"; // Assuming this is the handle

  if (!process.env.APPWRITE_API_KEY) process.exit(1);

  // 1. CONTROL TEST (All Random)
  console.log("\n[1] CONTROL TEST (All Random)");
  try {
    const doc = await db.createDocument(DB_ID, COLLECTIONS.USERS, ID.unique(), {
      auth_id: "iso_auth_" + ID.unique(),
      discord_id: "iso_disc_" + ID.unique(),
      discord_handle: "iso_handle_" + ID.unique(),
      full_name: "Iso Control",
      status: "active",
      details_points_current: 0,
      details_points_lifetime: 0,
    });
    console.log("✅ PASS");
    await db.deleteDocument(DB_ID, COLLECTIONS.USERS, doc.$id);
  } catch (e: any) {
    console.log("❌ FAIL: Basic Creation Broken", e.message);
  }

  // 2. DISCORD ID TEST
  console.log("\n[2] DISCORD ID TEST (Target ID)");
  try {
    const doc = await db.createDocument(DB_ID, COLLECTIONS.USERS, ID.unique(), {
      auth_id: "iso_auth_" + ID.unique(),
      discord_id: TARGET_DISCORD, // <--- TARGET
      discord_handle: "iso_handle_" + ID.unique(),
      full_name: "Iso Discord",
      status: "active",
      details_points_current: 0,
      details_points_lifetime: 0,
    });
    console.log("✅ PASS: Discord ID is NOT Conflict");
    await db.deleteDocument(DB_ID, COLLECTIONS.USERS, doc.$id);
  } catch (e: any) {
    console.log("❌ FAIL: DISCORD ID CONFLICT!", e.message);
  }

  // 3. AUTH ID TEST
  console.log("\n[3] AUTH ID TEST (Target ID)");
  try {
    const doc = await db.createDocument(DB_ID, COLLECTIONS.USERS, ID.unique(), {
      auth_id: TARGET_AUTH, // <--- TARGET
      discord_id: "iso_disc_" + ID.unique(),
      discord_handle: "iso_handle_" + ID.unique(),
      full_name: "Iso Auth",
      status: "active",
      details_points_current: 0,
      details_points_lifetime: 0,
    });
    console.log("✅ PASS: Auth ID is NOT Conflict");
    await db.deleteDocument(DB_ID, COLLECTIONS.USERS, doc.$id);
  } catch (e: any) {
    console.log("❌ FAIL: AUTH ID CONFLICT!", e.message);
  }
}

main();
