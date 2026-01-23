import { Client, Databases } from "node-appwrite";
import { config } from "dotenv";

config({ path: ".env.production" });
config({ path: ".env.local" });

const ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;

const DB_ID = "v2_internal_ops";
const LEDGER_COLLECTION_ID = "ledger";

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const db = new Databases(client);

async function main() {
  console.log("🔧 Adding 'is_debit' attribute to Ledger...");
  try {
    await db.createBooleanAttribute(
      DB_ID,
      LEDGER_COLLECTION_ID,
      "is_debit",
      false, // required: false (old records default to false/positive)
      false, // default: false
      false, // array: false
    );
    console.log("✅ Success! 'is_debit' added.");
  } catch (error: any) {
    if (error.code === 409) {
      console.log("⚠️ Attribute 'is_debit' already exists. Skipping.");
    } else {
      console.error("❌ Failed to add attribute:", error.message);
      process.exit(1);
    }
  }
}

main();
