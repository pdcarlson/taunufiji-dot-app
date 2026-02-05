/**
 * Next.js Appwrite Utilities
 *
 * Re-exports core client functions and provides Next.js-specific
 * session handling via cookies.
 */

import {
  Account as NodeAccount,
  Databases as NodeDatabases,
} from "node-appwrite";
import { getSessionClient } from "@/lib/infrastructure/persistence/client";

// Re-export from core for backwards compatibility
export {
  getDatabase as adminDb,
  getUsers as adminUsers,
  getStorage as adminStorage,
  getSessionClient,
  getAccount,
  getSessionDatabase,
} from "@/lib/infrastructure/persistence/client";

// Legacy constants (kept for backwards compatibility)
export const SSR_DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "main";
export const SSR_APP_CONFIG_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_CONFIG_ID || "app_config";
export const SSR_EVENT_REGISTRATION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_EVENTS_ID ||
  "event_registrations";
export const SSR_COLLECTION_TASKS_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_TASKS_ID || "tasks";
export const SSR_COLLECTION_MEMBERS_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_MEMBERS_ID || "members";
export const SSR_CAMPAIGNS_ID = "campaigns";
export const SSR_SUPPORTERS_ID = "supporters";
export const SSR_TRANSACTIONS_ID = "transactions";
export const SSR_EXAM_METADATA_ID =
  process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_EXAM_METADATA_ID ||
  "exam_metadata";

// --- SESSION CLIENT (Cookie-based for Server Components) ---
export async function createSessionClient() {
  // ⚠️ DEPRECATED/DISABLED: Cookie-based sessions are banned.
  throw new Error(
    "createSessionClient is deprecated. Use createJWTClient with a client-provided token.",
  );
}

// --- JWT CLIENT (For Client-Side Auth headers) ---
// NOTE: Use getSessionClient from @/lib/infrastructure/persistence/client instead
// This is kept for backwards compatibility
export function createJWTClient(jwt: string) {
  const client = getSessionClient(jwt);

  return {
    get account() {
      return new NodeAccount(client);
    },
    get databases() {
      return new NodeDatabases(client);
    },
  };
}
