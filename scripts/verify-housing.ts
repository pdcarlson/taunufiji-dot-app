
import { Client, Databases, Permission, Role, ID } from "node-appwrite";
import { DB_ID, COLLECTIONS } from "../lib/types/schema";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // Admin Key

const db = new Databases(client);

    async function verify() {
    console.log("🧪 Testing Housing V2 Server Access...");

    try {
        const attrs = await db.listAttributes(DB_ID, "housing_schedules");
        console.log("KV: " + JSON.stringify(attrs.attributes.map((a: any) => ({ k: a.key, r: a.required, t: a.type }))));
    } catch (e) {
        console.error("Could not list attributes", e);
    }

    const scheduleId = ID.unique();
    const taskId = ID.unique();

    try {
        // 1. Create Schedule (Server Side)
        console.log("1. Creating Schedule...");
        const schedule = await db.createDocument(DB_ID, "housing_schedules", scheduleId, {
            title: "Test",
            active: true,
            recurrence_rule: "7",
            points_value: 10
        });
        console.log("✅ Schedule Created:", schedule.$id);

        /*
        // 2. Create Task (Server Side)
        console.log("2. Creating Assignment...");
        const task = await db.createDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskId, {
            title: "Test Task " + taskId,
            description: "Generated from " + scheduleId,
            status: "locked",
            type: "duty",
            points_value: 10,
            schedule_id: schedule.$id,
            is_fine: false
        });
        console.log("✅ Description Created:", task.$id);
        */
        
        // 3. Cleanup
        console.log("3. Cleaning up...");
        await db.deleteDocument(DB_ID, "housing_schedules", scheduleId);
        // await db.deleteDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskId);
        console.log("✅ Cleanup Complete");

    } catch (e: any) {
        console.error("❌ Verification Failed");
        if (e.response) {
             console.error("Appwrite Error:", JSON.stringify(e.response, null, 2));
        } else {
             console.error(e);
        }
        // Clean up if half-failed
        try { await db.deleteDocument(DB_ID, "housing_schedules", scheduleId); } catch {}
        try { await db.deleteDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, taskId); } catch {}
    }
}

verify();
