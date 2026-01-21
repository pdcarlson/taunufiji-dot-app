import { Client, Databases, ID } from "node-appwrite";
import { env } from "../lib/config/env";
import { DB_ID, COLLECTIONS } from "../lib/types/schema";

const client = new Client()
  .setEndpoint(
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      "https://appwrite.taunufiji.app/v1",
  )
  .setProject(
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "695ebb2e000e07f0f7a3",
  )
  .setKey(process.env.APPWRITE_API_KEY || "");

const db = new Databases(client);

async function main() {
  console.log("=== DB WRITE HEALTH CHECK ===");
  console.log(
    `Target: ${COLLECTIONS.ASSIGNMENTS} (Using Assignments to verify write access)`,
  );

  if (!process.env.APPWRITE_API_KEY) process.exit(1);

  try {
    // Create a minimal Dummy Assignment
    const doc = await db.createDocument(
      DB_ID,
      COLLECTIONS.ASSIGNMENTS,
      ID.unique(),
      {
        title: "Debug Probe",
        description: "Testing Write Access",
        status: "open",
        type: "one_off",
        points_value: 0,
      },
    );
    console.log(
      "✅ SUCCESS: Created Assignment in 'assignments' collection:",
      doc.$id,
    );

    // Cleanup
    await db.deleteDocument(DB_ID, COLLECTIONS.ASSIGNMENTS, doc.$id);
    console.log("✅ Cleanup successful.");
  } catch (e: any) {
    console.log("❌ FAILED:", e.message);
    if (e.code === 400) {
      console.log(
        "-> 400 is GOOD. It means Write Access works, just missing schema fields.",
      );
    } else if (e.code === 409) {
      console.log("-> 409 is BAD. System is conflciting universally?");
    }
  }
}

main();
