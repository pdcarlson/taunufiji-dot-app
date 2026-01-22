import { Client, Databases } from "node-appwrite";
import { DB_ID, COLLECTIONS } from "../lib/types/schema";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const db = new Databases(client);

async function migrate() {
  console.log("🔄 Starting Schema Migration...");

  try {
    console.log("Adding 'lead_time_hours' to 'housing_schedules'...");
    // 24 hours default lead time
    await db.createIntegerAttribute(
      DB_ID,
      COLLECTIONS.SCHEDULES,
      "lead_time_hours",
      false, // required? No, for backward compat
      0, // min
      10000, // max
      24, // default
    );
    console.log("✅ Attribute created.");
  } catch (e: any) {
    if (e.code === 409) {
      console.log("⚠️ Attribute 'lead_time_hours' already exists.");
    } else {
      console.error("❌ Failed to create attribute:", e);
    }
  }

  // Poll for availability? Usually fast for Attributes.
  console.log("Done.");
}

migrate();
