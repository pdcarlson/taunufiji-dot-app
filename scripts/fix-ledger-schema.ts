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
  console.log("🔧 Fixing Ledger Schema 'amount' range...");
  try {
    // Attempt update: Make optional (false). Min/Max expanded. Omit default.
    await db.updateIntegerAttribute(
      DB_ID,
      LEDGER_COLLECTION_ID,
      "amount",
      false, // required: FALSE
      -999999, // Min
      999999, // Max
      // default: OMITTED
    );
    console.log("✅ Success!");
  } catch (error: any) {
    console.error("❌ Failed to update attribute:", error.message);
    process.exit(1);
  }
}

main();
