
import { Client, Databases } from "node-appwrite";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const db = new Databases(client);

const DB_ID = "v2_internal_ops";
const COLLECTION_ID = "housing_schedules";

async function main() {
    console.log("Checking attributes for:", COLLECTION_ID);

    try {
        // Create Attribute: active (boolean)
        await db.createBooleanAttribute(DB_ID, COLLECTION_ID, "active", false, true);
        console.log("✅ Created 'active' attribute.");
    } catch (e: any) {
        console.log("⚠️ 'active' attribute might already exist or error:", e.message);
    }
    
    // Also check 'assigned_to' just in case
    try {
        await db.createStringAttribute(DB_ID, COLLECTION_ID, "assigned_to", 255, false); // Not required
        console.log("✅ Created 'assigned_to' attribute.");
    } catch (e: any) {
        console.log("⚠️ 'assigned_to' attribute might already exist or error:", e.message);
    }

    console.log("Migration complete.");
}

main();
