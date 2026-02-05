/**
 * Domain Entities Index
 *
 * Re-exports all strict domain types.
 * Serves as a compatibility layer for keeping existing imports working
 * while transitioning to the new "types" directory structure.
 */

export * from "../types/base";
export * from "../types/user";
export * from "../types/task";
export * from "../types/schedule";
export * from "../types/ledger";
export * from "../types/library";
export * from "./dashboard.dto";

// Backwards Compatibility Aliases
import { User } from "../types/user";
export type Member = User;
