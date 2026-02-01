/**
 * Infrastructure Schema Configuration
 *
 * Defines the Database ID and Collection IDs used by the Appwrite SDK.
 * This file belongs in Infrastructure, NOT Domain.
 */

export const DB_ID = "v2_internal_ops";

export const COLLECTIONS = {
  USERS: "users",
  LIBRARY: "library_resources",
  ASSIGNMENTS: "assignments",
  SCHEDULES: "housing_schedules",
  LEDGER: "ledger",
  PROFESSORS: "professors",
  COURSES: "courses",
} as const;
