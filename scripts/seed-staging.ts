/**
 * Seed Staging Database
 *
 * Exports non-user-specific data (schedules, courses, professors)
 * from production and imports into the staging Appwrite project.
 *
 * Usage:
 *   npx tsx scripts/seed-staging.ts
 *
 * Requires both PROD and STAGING env vars:
 *   PROD_APPWRITE_API_KEY, STAGING_APPWRITE_API_KEY
 *
 * SAFETY: Only copies schedules, courses, and professors.
 * NEVER copies users, assignments, or ledger entries.
 */

import { Client, Databases, Query, ID } from "node-appwrite";

// --- Configuration ---
const PROD_ENDPOINT = "https://appwrite.taunufiji.app/v1";
const PROD_PROJECT = "695ebb2e000e07f0f7a3";
const STAGING_PROJECT = "69962e76002d70a10c9d";

const DB_ID = "v2_internal_ops";

// Collections safe to copy (no user-specific data)
const SEED_COLLECTIONS = [
  "housing_schedules",
  "professors",
  "courses",
] as const;

// Collections we NEVER copy
// users, assignments, ledger — contain user-specific data

function getClient(
  projectId: string,
  apiKey: string,
): { client: Client; db: Databases } {
  const client = new Client()
    .setEndpoint(PROD_ENDPOINT)
    .setProject(projectId)
    .setKey(apiKey);
  return { client, db: new Databases(client) };
}

async function seedCollection(
  prodDb: Databases,
  stagingDb: Databases,
  collectionId: string,
): Promise<{ copied: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let copied = 0;
  let skipped = 0;

  console.log(`\n📦 Seeding collection: ${collectionId}`);

  // Fetch all documents from prod
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const result = await prodDb.listDocuments(DB_ID, collectionId, [
      Query.limit(limit),
      Query.offset(offset),
    ]);

    for (const doc of result.documents) {
      try {
        // Check if already exists in staging
        try {
          await stagingDb.getDocument(DB_ID, collectionId, doc.$id);
          skipped++;
          continue; // Already exists
        } catch {
          // Not found — proceed to create
        }

        // Strip Appwrite metadata, keep only data fields
        const data: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(doc)) {
          if (!key.startsWith("$")) {
            data[key] = value;
          }
        }

        await stagingDb.createDocument(DB_ID, collectionId, doc.$id, data);
        copied++;
      } catch (error) {
        const msg = `Failed to copy ${doc.$id}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(msg);
        console.error(`  ❌ ${msg}`);
      }
    }

    offset += limit;
    hasMore = result.documents.length === limit;
  }

  console.log(
    `  ✅ Copied: ${copied}, Skipped (already exists): ${skipped}, Errors: ${errors.length}`,
  );
  return { copied, skipped, errors };
}

async function main() {
  const prodKey = process.env.PROD_APPWRITE_API_KEY;
  const stagingKey = process.env.STAGING_APPWRITE_API_KEY;

  if (!prodKey || !stagingKey) {
    console.error(
      "❌ Set PROD_APPWRITE_API_KEY and STAGING_APPWRITE_API_KEY env vars",
    );
    process.exit(1);
  }

  const { db: prodDb } = getClient(PROD_PROJECT, prodKey);
  const { db: stagingDb } = getClient(STAGING_PROJECT, stagingKey);

  console.log("🌱 Seeding staging database from production...");
  console.log(`   Prod project:    ${PROD_PROJECT}`);
  console.log(`   Staging project: ${STAGING_PROJECT}`);
  console.log(`   Collections:     ${SEED_COLLECTIONS.join(", ")}`);

  const summary: Record<
    string,
    { copied: number; skipped: number; errors: string[] }
  > = {};

  for (const collection of SEED_COLLECTIONS) {
    summary[collection] = await seedCollection(prodDb, stagingDb, collection);
  }

  console.log("\n📊 Summary:");
  for (const [name, result] of Object.entries(summary)) {
    console.log(
      `   ${name}: ${result.copied} copied, ${result.skipped} skipped, ${result.errors.length} errors`,
    );
  }
}

main().catch(console.error);
