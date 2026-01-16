
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
    console.log("Fetching attributes for:", COLLECTION_ID);
    try {
        const res = await db.listAttributes(DB_ID, COLLECTION_ID);
        console.log("Attributes:");
        res.attributes.forEach((attr: any) => {
            console.log(`- ${attr.key} (${attr.type})`);
        });
    } catch (e: any) {
        console.error("Failed:", e.message);
    }
}

main();
