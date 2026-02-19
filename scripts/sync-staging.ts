/**
 * Sync Staging Database
 *
 * Clones production database schema and selective data into the staging project.
 *
 * What it does:
 *   1. Creates the database in staging (if not exists)
 *   2. Clones ALL collection schemas (attributes + indexes)
 *   3. Copies full data for: professors, courses, ledger, library_resources
 *   4. Leaves empty (schema only): users, assignments, housing_schedules
 *
 * Usage:
 *   npx tsx scripts/sync-staging.ts
 *
 * Config:
 *   Requires SOURCE_APPWRITE_ENDPOINT, SOURCE_APPWRITE_PROJECT_ID, SOURCE_APPWRITE_API_KEY
 *   and NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY (Target)
 */

import { Client, Databases, Query } from "node-appwrite";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// ─── Configuration ─────────────────────────────────────────────────────────────

// Load all potential env files
[".env.local", ".env.production", ".env.staging", ".env"].forEach(file => {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

const CONFIG = {
  SOURCE: {
    ENDPOINT: process.env.SOURCE_APPWRITE_ENDPOINT,
    PROJECT: process.env.SOURCE_APPWRITE_PROJECT_ID,
    KEY: process.env.SOURCE_APPWRITE_API_KEY,
  },
  TARGET: {
    ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    PROJECT: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    KEY: process.env.APPWRITE_API_KEY || process.env.STAGING_API_KEY,
  },
  DB: {
    ID: "v2_internal_ops",
    NAME: "V2 Internal Ops",
  },
  THROTTLE: {
    COLLECTION_DELAY: 500,
    ATTRIBUTE_DELAY: 300,
    BATCH_DELAY: 500,
  }
};

// Collections to copy data for (schema + data)
const COPY_DATA_COLLECTIONS = [
  "professors",
  "courses",
  "ledger",
  "library_resources",
];

// Collections for schema only (no data)
const SCHEMA_ONLY_COLLECTIONS = ["users", "assignments", "housing_schedules"];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getDb(config: { ENDPOINT?: string; PROJECT?: string; KEY?: string }): Databases {
  if (!config.ENDPOINT || !config.PROJECT || !config.KEY) {
    throw new Error(`Missing configuration for project ${config.PROJECT || 'unknown'}`);
  }
  const client = new Client()
    .setEndpoint(config.ENDPOINT)
    .setProject(config.PROJECT)
    .setKey(config.KEY);
  return new Databases(client);
}

function sleep(ms: number): Promise<void> {
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
    const result = await db.listAttributes(CONFIG.DB.ID, collectionId, [
      Query.limit(100),
    ]);
    const attrs = result.attributes as any[];

    const presentKeys = attrs.map((a: any) => a.key);
    const missing = expectedKeys.filter((k) => !presentKeys.includes(k));
    const processing = attrs.filter((a) => a.status !== "available");

    if (missing.length === 0 && processing.length === 0) {
      console.log(`  ✅ All ${expectedKeys.length} attributes ready`);
      return true;
    }

    if (attrs.some(a => a.status === "failed" || a.status === "stuck")) {
      console.error(`  ❌ Some attributes failed synchronization.`);
      return false;
    }

    console.log(`  ⏳ Waiting... Missing: ${missing.length}, Processing: ${processing.length}`);
    await sleep(2000);
  }
  return false;
}

// ─── Schema Cloning ─────────────────────────────────────────────────────────────

async function ensureDatabase(db: Databases): Promise<void> {
  try {
    await db.get(CONFIG.DB.ID);
    console.log(`  ✅ Database "${CONFIG.DB.ID}" already exists`);
  } catch {
    console.log(`  📦 Creating database "${CONFIG.DB.ID}"...`);
    await db.create(CONFIG.DB.ID, CONFIG.DB.NAME);
  }
}

async function cloneCollectionSchema(
  sourceDb: Databases,
  targetDb: Databases,
  collectionId: string,
): Promise<boolean> {
  try {
    await targetDb.getCollection(CONFIG.DB.ID, collectionId);
    console.log(`  ⏭️  Collection "${collectionId}" exists — skipping schema`);
    return true;
  } catch {}

  const collection = await sourceDb.getCollection(CONFIG.DB.ID, collectionId);
  const attrResult = await sourceDb.listAttributes(CONFIG.DB.ID, collectionId, [Query.limit(100)]);
  const indexResult = await sourceDb.listIndexes(CONFIG.DB.ID, collectionId);

  console.log(`  📋 Cloning "${collectionId}": ${attrResult.total} attrs, ${indexResult.total} indexes`);

  await targetDb.createCollection(
    CONFIG.DB.ID,
    collectionId,
    collection.name,
    collection.$permissions,
    collection.documentSecurity,
    collection.enabled,
  );

  for (const attr of attrResult.attributes) {
    if (attr.status !== "available") continue;
    try {
      await createAttribute(targetDb, collectionId, attr);
    } catch (e) {
      console.error(`    ❌ Attr "${attr.key}" failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(CONFIG.THROTTLE.ATTRIBUTE_DELAY);
  }

  const expectedKeys = attrResult.attributes.map((a: any) => a.key);
  await waitForAttributes(targetDb, collectionId, expectedKeys);

  for (const idx of indexResult.indexes) {
    if (idx.status !== "available") continue;
    try {
      await targetDb.createIndex(CONFIG.DB.ID, collectionId, idx.key, idx.type, idx.attributes, idx.orders || []);
    } catch (e) {
      console.error(`    ❌ Index "${idx.key}" failed.`);
    }
  }

  return true;
}

async function createAttribute(db: Databases, collectionId: string, attr: any): Promise<void> {
  const base = { databaseId: CONFIG.DB.ID, collectionId, key: attr.key, required: attr.required, array: attr.array || false };
  const def = attr.required ? undefined : (attr.default ?? undefined);

  switch (attr.type) {
    case "string":
      if (attr.format === "email") await db.createEmailAttribute({ ...base, default: def });
      else if (attr.format === "url") await db.createUrlAttribute({ ...base, default: def });
      else if (attr.format === "ip") await db.createIpAttribute({ ...base, default: def });
      else if (attr.format === "enum") await db.createEnumAttribute({ ...base, elements: attr.elements, default: def });
      else await db.createStringAttribute({ ...base, size: attr.size, default: def });
      break;
    case "integer":
      await db.createIntegerAttribute({ ...base, min: attr.min, max: attr.max, default: def });
      break;
    case "double":
      await db.createFloatAttribute({ ...base, min: attr.min, max: attr.max, default: def });
      break;
    case "boolean":
      await db.createBooleanAttribute({ ...base, default: def });
      break;
    case "datetime":
      await db.createDatetimeAttribute({ ...base, default: def });
      break;
  }
}

// ─── Data Copying ───────────────────────────────────────────────────────────────

async function copyCollectionData(sourceDb: Databases, targetDb: Databases, collectionId: string) {
  let copied = 0, skipped = 0, errors = 0, offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const result = await sourceDb.listDocuments(CONFIG.DB.ID, collectionId, [Query.limit(limit), Query.offset(offset)]);
    for (const doc of result.documents) {
      try {
        await targetDb.getDocument(CONFIG.DB.ID, collectionId, doc.$id);
        skipped++;
        continue;
      } catch {}

      const data: Record<string, any> = {};
      for (const [key, value] of Object.entries(doc)) {
        if (!key.startsWith("$")) data[key] = value;
      }

      try {
        await targetDb.createDocument(CONFIG.DB.ID, collectionId, doc.$id, data, doc.$permissions);
        copied++;
      } catch (e) {
        errors++;
      }
    }
    offset += limit;
    hasMore = result.documents.length === limit;
  }
  return { copied, skipped, errors };
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔄 Sync Staging Database (Isolated)\n");

  try {
    const sourceDb = getDb(CONFIG.SOURCE);
    const targetDb = getDb(CONFIG.TARGET);

    console.log(`  Source: ${CONFIG.SOURCE.PROJECT} @ ${CONFIG.SOURCE.ENDPOINT}`);
    console.log(`  Target: ${CONFIG.TARGET.PROJECT} @ ${CONFIG.TARGET.ENDPOINT}\n`);

    await ensureDatabase(targetDb);

    const allCollections = [...COPY_DATA_COLLECTIONS, ...SCHEMA_ONLY_COLLECTIONS];
    for (const col of allCollections) {
      await cloneCollectionSchema(sourceDb, targetDb, col);
      await sleep(CONFIG.THROTTLE.COLLECTION_DELAY);
    }

    const summary: any = {};
    for (const col of COPY_DATA_COLLECTIONS) {
      console.log(`  📦 Copying data: "${col}"...`);
      summary[col] = await copyCollectionData(sourceDb, targetDb, col);
      await sleep(CONFIG.THROTTLE.BATCH_DELAY);
    }

    console.log("\n📊 Summary:");
    Object.entries(summary).forEach(([name, r]: [string, any]) => {
      console.log(`  ${name}: ${r.copied} copied, ${r.skipped} skipped, ${r.errors} errors`);
    });
    console.log(`  Empty (Schema Only): ${SCHEMA_ONLY_COLLECTIONS.join(", ")}`);
    console.log("\n✨ Done!");
  } catch (e) {
    console.error("\n❌ Sync Failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
