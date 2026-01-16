
import { Client, Databases, Permission, Role } from "node-appwrite";
import { DB_ID, COLLECTIONS } from "../lib/types/schema";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const db = new Databases(client);

async function setup() {
    console.log("Setting up Housing V2...");

    // 1. Create Schedules Collection
    try {
        await db.createCollection(DB_ID, COLLECTIONS.SCHEDULES, "Housing Schedules", [
            Permission.read(Role.any()), // Public Read (or authenticated?)
            Permission.write(Role.team("cabinet")), // Only admins
        ]);
        console.log("✅ Created Collection: housing_schedules");
    } catch (e: any) {
        if (e.code === 409) console.log("ℹ️ Collection housing_schedules already exists");
        else console.error("Error creating collection", e);
    }

    // 2. Attributes for Schedules
    const scheduleAttrs = [
        { key: "title", type: "string", size: 255, req: true },
        { key: "description", type: "string", size: 1000, req: false },
        { key: "recurrence_rule", type: "string", size: 255, req: true },
        { key: "assigned_to", type: "string", size: 255, req: false },
        { key: "points_value", type: "integer", req: true },
        { key: "active", type: "boolean", req: true, default: true },
        { key: "last_generated_at", type: "datetime", req: false },
    ];

    for (const attr of scheduleAttrs) {
        try {
            if (attr.type === "string") {
                await db.createStringAttribute(DB_ID, COLLECTIONS.SCHEDULES, attr.key, attr.size, attr.req);
            } else if (attr.type === "integer") {
                await db.createIntegerAttribute(DB_ID, COLLECTIONS.SCHEDULES, attr.key, attr.req);
            } else if (attr.type === "boolean") {
                await db.createBooleanAttribute(DB_ID, COLLECTIONS.SCHEDULES, attr.key, attr.req, attr.default);
            } else if (attr.type === "datetime") {
                await db.createDatetimeAttribute(DB_ID, COLLECTIONS.SCHEDULES, attr.key, attr.req);
            }
            console.log(`   + Attribute: ${attr.key}`);
        } catch (e: any) {
             if (e.code === 409) { /* ignore exists */ }
             else console.error(`Error adding attribute ${attr.key}`, e);
        }
    }

    // 3. New Attributes for Assignments
    const assignAttrs = [
        { key: "type", type: "string", size: 50, req: false, default: "duty" },
        { key: "schedule_id", type: "string", size: 255, req: false },
        { key: "initial_image_s3_key", type: "string", size: 1000, req: false },
        { key: "expires_at", type: "datetime", req: false },
        { key: "unlock_at", type: "datetime", req: false },
        { key: "is_fine", type: "boolean", req: false, default: false }
    ];

    for (const attr of assignAttrs) {
        try {
             if (attr.type === "string") {
                await db.createStringAttribute(DB_ID, COLLECTIONS.ASSIGNMENTS, attr.key, attr.size, attr.req, attr.default);
            } else if (attr.type === "datetime") {
                await db.createDatetimeAttribute(DB_ID, COLLECTIONS.ASSIGNMENTS, attr.key, attr.req);
            } else if (attr.type === "boolean") {
                await db.createBooleanAttribute(DB_ID, COLLECTIONS.ASSIGNMENTS, attr.key, attr.req, attr.default);
            }
            console.log(`   + Attribute (Update): ${attr.key}`);
        } catch(e: any) {
            if (e.code === 409) { /* ignore */ }
            else console.error(`Error updating assignment attr ${attr.key}`, e);
        }
    }

    console.log("Housing V2 Setup Complete.");
}

setup();
