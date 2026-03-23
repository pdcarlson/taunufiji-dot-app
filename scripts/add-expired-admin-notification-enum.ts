/**
 * Ensures `expired_admin` is allowed for `assignments.notification_level` in Appwrite.
 *
 * **What we observed (Tau Nu Fiji staging):** `notification_level` is a **string** attribute, not an enum.
 * String attributes accept any UTF-8 string, so **no Appwrite change is required** for `expired_admin`.
 * This script still reports that clearly and only mutates the schema when the attribute is an **enum**.
 *
 * **If your project uses an enum** for `notification_level`, this script appends `expired_admin` via
 * `Databases.updateEnumAttribute` when missing.
 *
 * **Staging (default):** `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, and
 * `APPWRITE_STAGING_API_KEY` or `APPWRITE_API_KEY`.
 *
 * **Another project (e.g. production)** — set both target vars (production often uses a different project id):
 *
 * ```bash
 * APPWRITE_TARGET_PROJECT_ID="<project id>" \
 * APPWRITE_TARGET_API_KEY="<server API key with databases.write>" \
 * npx tsx scripts/add-expired-admin-notification-enum.ts
 * ```
 */

import { Client, Databases, Models } from "node-appwrite";
import { DB_ID, COLLECTIONS } from "../lib/infrastructure/config/schema";

const NEW_ELEMENT = "expired_admin";
const ATTRIBUTE_KEY = "notification_level";

function getTargetConfig(): {
  endpoint: string;
  projectId: string;
  apiKey: string;
} {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId =
    process.env.APPWRITE_TARGET_PROJECT_ID ??
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey =
    process.env.APPWRITE_TARGET_API_KEY ??
    process.env.APPWRITE_STAGING_API_KEY ??
    process.env.APPWRITE_API_KEY;

  if (!endpoint || !projectId || !apiKey) {
    throw new Error(
      "Missing Appwrite config. Need NEXT_PUBLIC_APPWRITE_ENDPOINT, project id (NEXT_PUBLIC_APPWRITE_PROJECT_ID or APPWRITE_TARGET_PROJECT_ID), and API key (APPWRITE_TARGET_API_KEY, APPWRITE_STAGING_API_KEY, or APPWRITE_API_KEY).",
    );
  }

  return { endpoint, projectId, apiKey };
}

async function main(): Promise<void> {
  const { endpoint, projectId, apiKey } = getTargetConfig();
  const databases = new Databases(
    new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey),
  );

  const attr = await databases.getAttribute({
    databaseId: DB_ID,
    collectionId: COLLECTIONS.ASSIGNMENTS,
    key: ATTRIBUTE_KEY,
  });

  type AttributeMeta = { type?: string; format?: string };
  const { type, format } = attr as unknown as AttributeMeta;

  // Handle string attributes with format === "enum" (they are enums)
  if (type === "string" && format === "enum") {
    console.log(
      `Detected enum attribute "${ATTRIBUTE_KEY}" (type=string, format=enum). Checking for "${NEW_ELEMENT}"...`,
    );
    // Fall through to enum handling logic below
  } else if (type === "string") {
    // Non-enum strings accept any value
    console.log(
      `OK: "${ATTRIBUTE_KEY}" is a string attribute — "${NEW_ELEMENT}" is already allowed at runtime. No schema update.`,
    );
    return;
  } else if (type !== "enum") {
    // Not a string, not an enum - unexpected type
    console.error(
      `Attribute "${ATTRIBUTE_KEY}" has unexpected type "${type ?? "unknown"}". Update Appwrite manually or extend this script.`,
    );
    process.exitCode = 1;
    return;
  } else {
    // type === "enum"
    console.log(
      `Detected enum attribute "${ATTRIBUTE_KEY}" (type=enum). Checking for "${NEW_ELEMENT}"...`,
    );
  }

  const enumAttr = attr as Models.AttributeEnum;
  const elements = enumAttr.elements ?? [];
  if (elements.includes(NEW_ELEMENT)) {
    console.log(
      `OK: "${NEW_ELEMENT}" already present on enum "${ATTRIBUTE_KEY}" (${elements.length} values).`,
    );
    return;
  }

  const nextElements = [...elements, NEW_ELEMENT];
  const required = Boolean(enumAttr.required);

  console.log(
    `Updating enum "${ATTRIBUTE_KEY}": adding "${NEW_ELEMENT}" (${elements.length} -> ${nextElements.length} values).`,
  );

  await databases.updateEnumAttribute({
    databaseId: DB_ID,
    collectionId: COLLECTIONS.ASSIGNMENTS,
    key: ATTRIBUTE_KEY,
    elements: nextElements,
    required,
    ...(enumAttr.default !== undefined && enumAttr.default !== ""
      ? { xdefault: enumAttr.default }
      : {}),
  });

  console.log("Submitted enum update. Appwrite may take a moment to apply.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});