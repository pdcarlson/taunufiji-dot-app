/**
 * Centralized Appwrite Client Factory
 *
 * This module provides a single source of truth for all Appwrite client creation.
 * All services and repositories should import from here instead of creating their own clients.
 *
 * Benefits:
 * - Single configuration point (no drift)
 * - Singleton pattern for efficiency
 * - Easy to mock for testing
 * - Consistent error handling
 */

import { Client, Databases, Users, Account, Storage } from "node-appwrite";
import { env } from "@/lib/infrastructure/config/env";

// Singleton admin client instance
let adminClient: Client | null = null;

// Cache for session clients (JWT-based)
const sessionClientCache = new Map<
  string,
  { client: Client; timestamp: number }
>();

// Session cache TTL (5 minutes)
const SESSION_CACHE_TTL = 5 * 60 * 1000;

/**
 * Get the admin client (API Key authentication)
 * Used for server-side operations without user context.
 */
export function getAdminClient(): Client {
  if (!adminClient) {
    if (!env.APPWRITE_API_KEY) {
      throw new Error("APPWRITE_API_KEY is required for admin client");
    }

    adminClient = new Client()
      .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(env.APPWRITE_API_KEY);
  }
  return adminClient;
}

/**
 * Get a session client (JWT authentication)
 * Used for operations on behalf of a specific user.
 * Caches clients to avoid recreating for same JWT.
 */
export function getSessionClient(jwt: string): Client {
  const now = Date.now();

  // Check cache and TTL
  const cached = sessionClientCache.get(jwt);
  if (cached && now - cached.timestamp < SESSION_CACHE_TTL) {
    return cached.client;
  }

  // Create new session client
  const client = new Client()
    .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setJWT(jwt);

  sessionClientCache.set(jwt, { client, timestamp: now });

  // Clean up expired entries
  cleanupSessionCache();

  return client;
}

/**
 * Clean up expired session clients from cache
 */
function cleanupSessionCache(): void {
  const now = Date.now();
  for (const [key, value] of sessionClientCache.entries()) {
    if (now - value.timestamp >= SESSION_CACHE_TTL) {
      sessionClientCache.delete(key);
    }
  }
}

// ============================================================================
// Convenience Accessors (Admin Context)
// ============================================================================

/**
 * Get Databases instance with admin privileges
 */
export function getDatabase(): Databases {
  return new Databases(getAdminClient());
}

/**
 * Get Users instance with admin privileges
 */
export function getUsers(): Users {
  return new Users(getAdminClient());
}

/**
 * Get Storage instance with admin privileges
 */
export function getStorage(): Storage {
  return new Storage(getAdminClient());
}

// ============================================================================
// Session Context Accessors
// ============================================================================

/**
 * Get Account instance for a specific user session
 */
export function getAccount(jwt: string): Account {
  return new Account(getSessionClient(jwt));
}

/**
 * Get Databases instance for a specific user session
 */
export function getSessionDatabase(jwt: string): Databases {
  return new Databases(getSessionClient(jwt));
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Reset all client instances (for testing)
 */
export function resetClients(): void {
  adminClient = null;
  sessionClientCache.clear();
}

/**
 * Inject a mock admin client (for testing)
 */
export function setAdminClient(client: Client): void {
  adminClient = client;
}
