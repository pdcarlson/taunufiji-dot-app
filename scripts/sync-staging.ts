/**
 * Sync Staging Database
 *
 * Clones production database schema and selective data into the staging project.
 *
 * What it does:
 *   1. Creates the database in staging (if not exists)
 *   2. Clones ALL collection schemas (attributes + indexes)
 *   3. Copies full data for: users, housing_schedules, professors, courses
 *   4. Leaves empty (schema only): assignments, ledger, library_resources
 *
 * Usage:
 *   npx tsx scripts/sync-staging.ts
 *
 * Reads API keys from .env.production and .env.staging files.
 */

import { Client, Databases, Query } from "node-appwrite";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// ─── Configuration ─────────────────────────────────────────────────────────────

const ENDPOINT = "https://appwrite.taunufiji.app/v1";
const PROD_PROJECT = "695ebb2e000e07f0f7a3";
const STAGING_PROJECT = "69962e76002d70a10c9d";
const DB_ID = "v2_internal_ops";
const DB_NAME = "V2 Internal Ops";

// Collections to copy data for (schema + data)
const COPY_DATA_COLLECTIONS = [
  "users",
  "housing_schedules",
  "professors",
  "courses",
];

// Collections for schema only (no data)
const SCHEMA_ONLY_COLLECTIONS = ["assignments", "ledger", "library_resources"];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function loadEnv(envFile: string): Record<string, string> {
  const envPath = path.resolve(process.cwd(), envFile);
  if (!fs.existsSync(envPath)) {
    throw new Error(`${envFile} not found at ${envPath}`);
  }
  const parsed = dotenv.parse(fs.readFileSync(envPath));
  return parsed;
}

function getDb(projectId: string, apiKey: string): Databases {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(projectId)
    .setKey(apiKey);
  return new Databases(client);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sleep(ms: number): Promise<any> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAttributes(
  db: Databases,
  collectionId: string,
  expectedKeys: string[],
  maxWaitMs: number = 60000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const result = await db.listAttributes(DB_ID, collectionId, [
      Query.limit(100),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attrs = result.attributes as any[];

    // Check missing attributes (not in list)
    const presentKeys = attrs.map((a: any) => a.key);
    const missing = expectedKeys.filter((k) => !presentKeys.includes(k));

    // Check processing attributes (in list but not ready)
    const processing = attrs.filter((a) => a.status !== "available");

    if (missing.length === 0 && processing.length === 0) {
      console.log(`  ✅ All ${expectedKeys.length} attributes ready`);
      return true;
    }

    const failed = attrs.filter(
      (a) => a.status === "failed" || a.status === "stuck",
    );
    if (failed.length > 0) {
      console.error(
        `  ❌ Some attributes failed: ${failed.map((a: any) => a.key).join(", ")}`,
      );
      return false;
    }

    console.log(
      `  ⏳ Waiting... Missing: ${missing.length}, Processing: ${processing.length}`,
    );
    await sleep(2000);
  }
  console.warn(`  ⚠️  Timeout waiting for attributes (${maxWaitMs}ms)`);
  return false;
}

// ─── Schema Cloning ─────────────────────────────────────────────────────────────

async function ensureDatabase(db: Databases): Promise<void> {
  try {
    await db.get(DB_ID);
    console.log(`  ✅ Database "${DB_ID}" already exists`);
  } catch {
    console.log(`  📦 Creating database "${DB_ID}"...`);
    await db.create(DB_ID, DB_NAME);
    console.log(`  ✅ Database created`);
  }
}

async function cloneCollectionSchema(
  prodDb: Databases,
  stagingDb: Databases,
  collectionId: string,
): Promise<boolean> {
  // Check if already exists in staging
  try {
    await stagingDb.getCollection(DB_ID, collectionId);
    console.log(
      `  ⏭️  Collection "${collectionId}" already exists — skipping schema`,
    );
    return true;
  } catch {
    // Doesn't exist, proceed
  }

  // Get the source collection
  const collection = await prodDb.getCollection(DB_ID, collectionId);

  // Get attributes from prod
  const attrResult = await prodDb.listAttributes(DB_ID, collectionId, [
    Query.limit(100),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attributes = attrResult.attributes as any[];

  // Get indexes from prod
  const indexResult = await prodDb.listIndexes(DB_ID, collectionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indexes = indexResult.indexes as any[];

  console.log(
    `  📋 Cloning "${collectionId}": ${attributes.length} attrs, ${indexes.length} indexes`,
  );

  // Create collection with inline attributes and indexes
  // The createCollection API accepts attributes[] and indexes[] for batch creation
  await stagingDb.createCollection(
    DB_ID,
    collectionId,
    collection.name,
    collection.$permissions,
    collection.documentSecurity,
    collection.enabled,
  );

  // Create attributes one by one (createCollection with inline attrs has limitations)
  for (const attr of attributes) {
    if (attr.status !== "available") continue;

    try {
      await createAttribute(stagingDb, collectionId, attr);
    } catch (e) {
      console.error(
        `    ❌ Failed to create attr "${attr.key}": ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    await sleep(300); // Rate limiting for attribute creation
  }

  // Wait for all attributes to be ready before creating indexes
  const expectedKeys = attributes.map((a: any) => a.key);
  await waitForAttributes(stagingDb, collectionId, expectedKeys);

  // Create indexes
  for (const idx of indexes) {
    if (idx.status !== "available") continue;

    try {
      await stagingDb.createIndex(
        DB_ID,
        collectionId,
        idx.key,
        idx.type,
        idx.attributes,
        idx.orders || [],
      );
    } catch (e) {
      console.error(
        `    ❌ Failed to create index "${idx.key}": ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  console.log(`  ✅ Schema cloned for "${collectionId}"`);
  return true;
}

async function createAttribute(
  db: Databases,
  collectionId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attr: any,
): Promise<void> {
  const base = {
    databaseId: DB_ID,
    collectionId,
    key: attr.key,
    required: attr.required,
    array: attr.array || false,
  };

  switch (attr.type) {
    case "string":
      if (attr.format === "email") {
        await db.createEmailAttribute({
          ...base,
          default: attr.required ? undefined : (attr.default ?? undefined),
        });
      } else if (attr.format === "url") {
        await db.createUrlAttribute({
          ...base,
          default: attr.required ? undefined : (attr.default ?? undefined),
        });
      } else if (attr.format === "ip") {
        await db.createIpAttribute({
          ...base,
          default: attr.required ? undefined : (attr.default ?? undefined),
        });
      } else if (attr.format === "enum") {
        await db.createEnumAttribute({
          ...base,
          elements: attr.elements,
          default: attr.required ? undefined : (attr.default ?? undefined),
        });
      } else {
        await db.createStringAttribute({
          ...base,
          size: attr.size,
          default: attr.required ? undefined : (attr.default ?? undefined),
        });
      }
      break;

    case "integer": {
      // Check if min/max are within safe integer range
      const minSafe =
        attr.min !== null &&
        attr.min >= Number.MIN_SAFE_INTEGER &&
        attr.min <= Number.MAX_SAFE_INTEGER
          ? attr.min
          : undefined;
      const maxSafe =
        attr.max !== null &&
        attr.max >= Number.MIN_SAFE_INTEGER &&
        attr.max <= Number.MAX_SAFE_INTEGER
          ? attr.max
          : undefined;

      await db.createIntegerAttribute({
        ...base,
        min: minSafe,
        max: maxSafe,
        default: attr.required ? undefined : (attr.default ?? undefined),
      });
      break;
    }

    case "double":
      await db.createFloatAttribute({
        ...base,
        min: attr.min ?? undefined,
        max: attr.max ?? undefined,
        default: attr.required ? undefined : (attr.default ?? undefined),
      });
      break;

    case "boolean":
      await db.createBooleanAttribute({
        ...base,
        default: attr.required ? undefined : (attr.default ?? undefined),
      });
      break;

    case "datetime":
      await db.createDatetimeAttribute({
        ...base,
        default: attr.required ? undefined : (attr.default ?? undefined),
      });
      break;

    default:
      console.warn(
        `    ⚠️  Unknown attribute type "${attr.type}" for key "${attr.key}"`,
      );
  }
}

// ─── Data Copying ───────────────────────────────────────────────────────────────

async function copyCollectionData(
  prodDb: Databases,
  stagingDb: Databases,
  collectionId: string,
): Promise<{ copied: number; skipped: number; errors: number }> {
  let copied = 0;
  let skipped = 0;
  let errors = 0;
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const result = await prodDb.listDocuments(DB_ID, collectionId, [
      Query.limit(limit),
      Query.offset(offset),
    ]);

    for (const doc of result.documents) {
      // Check if already exists
      try {
        await stagingDb.getDocument(DB_ID, collectionId, doc.$id);
        skipped++;
        continue;
      } catch {
        // Not found — create it
      }

      // Strip Appwrite metadata
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {};
      for (const [key, value] of Object.entries(doc)) {
        if (!key.startsWith("$")) {
          data[key] = value;
        }
      }

      try {
        await stagingDb.createDocument(
          DB_ID,
          collectionId,
          doc.$id,
          data,
          doc.$permissions,
        );
        copied++;
      } catch (e) {
        errors++;
        console.error(
          `    ❌ Doc ${doc.$id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    offset += limit;
    hasMore = result.documents.length === limit;
  }

  return { copied, skipped, errors };
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔄 Sync Staging Database");
  console.log("========================\n");

  // Load env files
  const prodEnv = loadEnv(".env.production");
  const stagingEnv = loadEnv(".env.staging");

  const prodApiKey = prodEnv.APPWRITE_API_KEY;
  const stagingApiKey = stagingEnv.APPWRITE_API_KEY;

  if (!prodApiKey || !stagingApiKey) {
    console.error(
      "❌ Missing APPWRITE_API_KEY in .env.production or .env.staging",
    );
    process.exit(1);
  }

  const prodDb = getDb(PROD_PROJECT, prodApiKey);
  const stagingDb = getDb(STAGING_PROJECT, stagingApiKey);

  const allCollections = [...COPY_DATA_COLLECTIONS, ...SCHEMA_ONLY_COLLECTIONS];

  // Step 1: Create database
  console.log("Step 1: Ensure database exists");
  await ensureDatabase(stagingDb);

  // Step 2: Clone schemas
  console.log("\nStep 2: Clone collection schemas");
  for (const col of allCollections) {
    await cloneCollectionSchema(prodDb, stagingDb, col);
    await sleep(500); // Rate limiting
  }

  // Step 3: Copy data for selected collections
  console.log("\nStep 3: Copy data");
  const summary: Record<
    string,
    { copied: number; skipped: number; errors: number }
  > = {};

  for (const col of COPY_DATA_COLLECTIONS) {
    console.log(`  📦 Copying "${col}"...`);
    summary[col] = await copyCollectionData(prodDb, stagingDb, col);
    const r = summary[col];
    console.log(
      `  ✅ ${col}: ${r.copied} copied, ${r.skipped} skipped, ${r.errors} errors`,
    );
    await sleep(500);
  }

  for (const col of SCHEMA_ONLY_COLLECTIONS) {
    console.log(`  ⏭️  "${col}" — schema only, no data copied`);
  }

  // Summary
  console.log("\n📊 Final Summary");
  console.log("─".repeat(50));
  for (const [name, result] of Object.entries(summary)) {
    console.log(
      `  ${name}: ${result.copied} copied, ${result.skipped} skipped, ${result.errors} errors`,
    );
  }
  console.log(`  ${SCHEMA_ONLY_COLLECTIONS.join(", ")}: schema only (empty)`);
  console.log("\n✨ Done!");
}

main().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
