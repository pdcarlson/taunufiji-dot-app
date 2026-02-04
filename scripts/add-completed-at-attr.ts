import { Client, Databases } from "node-appwrite";
import { DB_ID, COLLECTIONS } from "@/lib/infrastructure/config/schema";

// 1. Setup Client
const client = new Client();

console.log("Adding completed_at attribute to assignments...");
if (
  !process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  !process.env.APPWRITE_API_KEY
) {
  console.error(
    "Error: Missing environment variables (NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY)",
  );
  process.exit(1);
}

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function run() {
  try {
    // Add 'completed_at' as a datetime attribute, not required (false)
    await databases.createDatetimeAttribute(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      "completed_at",
      false,
    );
    console.log("Success: Attribute 'completed_at' created.");
  } catch (error: any) {
    console.error("Migration Failed:", error.message);
  }
}

run();
