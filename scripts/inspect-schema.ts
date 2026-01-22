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
  try {
    const attrs = await db.listAttributes(DB_ID, COLLECTION_ID);
    const statusAttr = attrs.attributes.find((a: any) => a.key === "status");
    console.log(
      "Current Status Attribute:",
      JSON.stringify(statusAttr, null, 2),
    );
  } catch (e) {
    console.error("Failed to list attributes:", e);
  }
}

main();
