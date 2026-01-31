/**
 * Core Appwrite Infrastructure
 *
 * Re-exports all Appwrite-related infrastructure components.
 */

// Client factory
export {
  getAdminClient,
  getSessionClient,
  getDatabase,
  getUsers,
  getStorage,
  getAccount,
  getSessionDatabase,
  resetClients,
  setAdminClient,
} from "./client";

// Repository implementations
export { AppwriteTaskRepository } from "./task.repository";
export { AppwriteUserRepository } from "./user.repository";
export { AppwriteLedgerRepository } from "./ledger.repository";
