import { Client, Databases } from "node-appwrite";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const db = new Databases(client);

const DB_ID = "v2_internal_ops";
const COLLECTION_ID = "assignments";

async function main() {
  console.log("🛠️ Starting Force Enum Update...");

  try {
    // 1. Fetch Current
    console.log("1. Fetching current attributes...");
    const attrs = await db.listAttributes(DB_ID, COLLECTION_ID);
    const statusAttr: any = attrs.attributes.find(
      (a: any) => a.key === "status",
    );

    if (!statusAttr) {
      throw new Error("Status attribute not found!");
    }

    console.log("   Current Elements:", statusAttr.elements);

    // 2. Prepare New Elements
    const uniqueElements = new Set(statusAttr.elements);
    uniqueElements.add("locked");
    uniqueElements.add("expired");

    const newElements = Array.from(uniqueElements) as string[];
    console.log("2. New Elements List:", newElements);

    // 3. Update
    console.log("3. Updating Attribute...");
    // Explicitly casting or ensuring default is passed validly
    const result = await db.updateEnumAttribute(
      DB_ID,
      COLLECTION_ID,
      "status",
      newElements,
      "open",
    );

    console.log("✅ Update Call Complete.");
    console.log("   Result Elements:", result.elements);
  } catch (e: any) {
    console.error("❌ ERROR:", e.message);
    if (e.response) {
      console.error("   Response:", JSON.stringify(e.response, null, 2));
    }
  }
}

main();
