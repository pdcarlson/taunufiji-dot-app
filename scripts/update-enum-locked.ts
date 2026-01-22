import { Client, Databases } from "node-appwrite";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const db = new Databases(client);

const DB_ID = "v2_internal_ops";
const COLLECTIONS = {
  ASSIGNMENTS: "assignments",
};

async function main() {
  console.log("Updating 'status' enum for assignments...");

  try {
    // Current Enum elements + 'locked'
    const elements = [
      "open",
      "pending",
      "approved",
      "rejected",
      "expired",
      "claimed",
      "pending_review",
      "locked",
    ];

    await db.updateEnumAttribute(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      "status",
      elements,
      false,
    );
    console.log("✅ Successfully updated 'status' enum.");
  } catch (e: any) {
    console.error("❌ Failed to update enum:", e);
    if (e.response) {
      console.error("Response:", JSON.stringify(e.response, null, 2));
    }
  }
}

main();
