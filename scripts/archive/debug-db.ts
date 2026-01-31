import { Client, Databases, Query, ID } from "node-appwrite";
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
  console.log("=== APPWRITE SCHEMA INSPECTOR ===");

  if (!process.env.APPWRITE_API_KEY) {
    console.error("ERROR: APPWRITE_API_KEY is not set.");
    process.exit(1);
  }

  console.log("--- TARGETED INSPECTOR ---");

  // 1. Check Attributes for 'unique' property (if exposed) or 'required'
  const attrs = await db.listAttributes(DB_ID, COLLECTIONS.USERS);
  console.log("REQUIRED FIELDS:");
  attrs.attributes.forEach((a: any) => {
    if (a.required) console.log(`- ${a.key}`);
  })import { Client, Databases, Query, ID } from "node-appwrite";
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
  console.log("=== APPWRITE SCHEMA INSPECTOR ===");

  if (!process.env.APPWRITE_API_KEY) {
    console.error("ERROR: APPWRITE_API_KEY is not set.");
    process.exit(1);
  }

  console.log("--- TARGETED INSPECTOR ---");

  // 1. Check Attributes for 'unique' property (if exposed) or 'required'
  const attrs = await db.listAttributes(DB_ID, COLLECTIONS.USERS);
  console.log("REQUIRED FIELDS:");
  attrs.attributes.forEach((a: any) => {
    if (a.required) console.log(`- ${a.key}`);
  });

  // 2. Check Indexes (The definitive source of Uniqueness)
  console.log("\nUNIQUE INDEXES:");
  const indexes = await db.listIndexes(DB_ID, COLLECTIONS.USERS);
  indexes.indexes.forEach((idx: any) => {
    if (idx.type === "unique") {
      console.log(`- [${idx.key}] on fields: (${idx.attributes.join(", ")})`);
    }
  });
}

main();
