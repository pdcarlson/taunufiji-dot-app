// scripts/verify_tasks.ts
const { Client, Databases, Query } = require("node-appwrite");

// Hardcoded config for verification script - checking environment or hardcoded values
// Using the values usually found in lib/infrastructure/config/schema.ts or .env
// User context might imply these. I will try to infer or use standard names.
const ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "taunufiji"; // Guessing or need valid one.
const API_KEY = process.env.APPWRITE_API_KEY;

// If API Key is missing, this script won't work locally easily without .env
// But I can try to use the one from the project if available or ask user to run it with env vars.

const DB_ID = "taunufiji-db"; // Guessing based on "DB_ID" usage
const TASKS_COLLECTION = "assignments"; // Guessing
const USERS_COLLECTION = "users";

async function verify() {
  if (!API_KEY) {
    console.error("Please set APPWRITE_API_KEY env var");
    return;
  }

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  const db = new Databases(client);

  console.log("--- Verifying Tasks ---");
  try {
    const tasks = await db.listDocuments(DB_ID, TASKS_COLLECTION, [
      Query.limit(100),
    ]);
    console.log(`Found ${tasks.total} tasks.`);

    // Count status
    const counts = {};
    const assignedCounts = {};

    tasks.documents.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
      if (t.assigned_to) {
        assignedCounts[t.assigned_to] =
          (assignedCounts[t.assigned_to] || 0) + 1;
      }
    });

    console.log("Status Breakdown:", counts);
    console.log("Assignments Breakdown:", assignedCounts);

    // Check specific user if possible.
    // I don't know the user's ID, but I can list users.
    const users = await db.listDocuments(DB_ID, USERS_COLLECTION, [
      Query.limit(10),
    ]);
    console.log("\n--- Sample Users ---");
    users.documents.forEach((u) => {
      console.log(
        `User: ${u.full_name} (Discord: ${u.discord_id}) (Auth: ${u.auth_id})`,
      );
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
  }
}

verify();
