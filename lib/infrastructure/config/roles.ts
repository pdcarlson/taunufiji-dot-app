import { env } from "./env";

// Discord Role IDs (Snowflakes)
// Logic: Strictly use environment variables to ensure consistency across Local/Staging/Prod.
export const ROLES = {
  // Base Roles
  BROTHER: env.ROLE_ID_BROTHER,

  // Officers & Committee Chairs
  CABINET: env.ROLE_ID_CABINET,
  HOUSING_CHAIR: env.ROLE_ID_HOUSING_CHAIR,
  DEV: env.ROLE_ID_DEV,
} as const;

export type RoleKey = string; // IDs are strings

// Helper to filter out undefined roles (e.g. during local dev with incomplete .env)
const filterDefined = (roles: (string | undefined)[]): string[] => 
  roles.filter((r): r is string => !!r);

// Roles allowed to access the Library (Search & Download)
// Logic: Brother OR any officer role
export const LIBRARY_ACCESS_ROLES: string[] = filterDefined([
  ROLES.BROTHER,
  ROLES.CABINET,
  ROLES.HOUSING_CHAIR,
  ROLES.DEV,
]);

// Roles allowed to Manage Assignments (Housing)
export const HOUSING_ADMIN_ROLES: string[] = filterDefined([
  ROLES.HOUSING_CHAIR,
  ROLES.CABINET,
  ROLES.DEV,
]);
