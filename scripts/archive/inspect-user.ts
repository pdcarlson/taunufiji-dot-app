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
  console.log("=== USER INSPECTION ===");

  if (!process.env.APPWRITE_API_KEY) process.exit(1);

  try {
    const list = await db.listDocuments(DB_ID, COLLECTIONS.USERS);
    console.log(`Total Users: ${list.total}`);

    if (list.total > 0) {
      console.log(JSON.stringify(list.documents[0], null, 2));
    } else {
      console.log("No users found.");
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
