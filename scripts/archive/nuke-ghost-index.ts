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
  console.log("=== APPWRITE INDEX SURGEON ===");
  const INDEX_KEY = "discord_id_index";

  if (!process.env.APPWRITE_API_KEY) {
    console.error("ERROR: APPWRITE_API_KEY is not set.");
    process.exit(1);
  }

  try {
    console.log(
      `Attempting to delete index '${INDEX_KEY}' from ${COLLECTIONS.USERS}...`,
    );

    await db.deleteIndex(DB_ID, COLLECTIONS.USERS, INDEX_KEY);

    console.log("✅ SUCCESS: Index deleted. Unique constraint removed.");
    console.log("The user should now be able to log in.");
  } catch (err: any) {
    console.error("❌ OPERATION FAILED:", err.message);
    if (err.message.includes("not found")) {
      console.log(
        "Index might have a different name. Please check 'debug-db' output.",
      );
    }
  }
}

main();
