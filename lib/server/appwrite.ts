import { Client, Account, Databases } from "appwrite";
import { cookies } from "next/headers";

// NEW: Server SDK Imports (Aliased)
import {
  Client as NodeClient,
  Databases as NodeDatabases,
  Account as NodeAccount,
  Users as NodeUsers,
  Storage as NodeStorage,
} from "node-appwrite";

export const SSR_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'main';
export const SSR_APP_CONFIG_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_CONFIG_ID || 'app_config';
export const SSR_EVENT_REGISTRATION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_EVENTS_ID || 'event_registrations';
export const SSR_COLLECTION_TASKS_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_TASKS_ID || 'tasks';
export const SSR_COLLECTION_MEMBERS_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_MEMBERS_ID || 'members';
export const SSR_CAMPAIGNS_ID = 'campaigns'; // Hardcoded matches setup script
export const SSR_SUPPORTERS_ID = 'supporters';
export const SSR_TRANSACTIONS_ID = 'transactions';
export const SSR_EXAM_METADATA_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_EXAM_METADATA_ID || 'exam_metadata';

// --- SESSION CLIENT (Utility for Server Components) ---
export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  const session = (await cookies()).get(
    `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`
  );

  if (!session || !session.value) {
    throw new Error("No session");
  }

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
  };
}

// --- JWT CLIENT (For Client-Side Auth headers) ---
export function createJWTClient(jwt: string) {
  const client = new NodeClient()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setJWT(jwt);

  return {
    get account() {
      return new NodeAccount(client);
    },
    get databases() {
      return new NodeDatabases(client);
    },
  };
}

// --- ADMIN CLIENT (API KEY) ---
const globalAdminClient = new NodeClient()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

export const adminDb = new NodeDatabases(globalAdminClient);
export const adminUsers = new NodeUsers(globalAdminClient);
export const adminStorage = new NodeStorage(globalAdminClient);
