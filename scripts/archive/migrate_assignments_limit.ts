
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
    console.log("Checking attributes for:", COLLECTION_ID);

    try {
        // Create Attribute: execution_limit (int) - Days to complete after claiming
        await db.createIntegerAttribute(DB_ID, COLLECTION_ID, "execution_limit", false, 0, 255);
        console.log("✅ Created 'execution_limit' attribute.");
    } catch (e: any) {
        console.log("⚠️ 'execution_limit' attribute might already exist or error:", e.message);
    }

    console.log("Migration complete.");
}

main();
