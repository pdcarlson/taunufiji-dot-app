import { discordRolesEnv } from "./discord-roles-env";

type RoleEnvKey = keyof Pick<
  typeof discordRolesEnv,
  | "DISCORD_ROLE_ID_BROTHER"
  | "DISCORD_ROLE_ID_CABINET"
  | "DISCORD_ROLE_ID_HOUSING_CHAIR"
>;

const REQUIRED_ROLE_KEYS: RoleEnvKey[] = [
  "DISCORD_ROLE_ID_BROTHER",
  "DISCORD_ROLE_ID_CABINET",
  "DISCORD_ROLE_ID_HOUSING_CHAIR",
];

function resolveRequiredRoles(): {
  DISCORD_ROLE_ID_BROTHER: string;
  DISCORD_ROLE_ID_CABINET: string;
  DISCORD_ROLE_ID_HOUSING_CHAIR: string;
} {
  const missingKeys: string[] = [];

  for (const key of REQUIRED_ROLE_KEYS) {
    if (!discordRolesEnv[key]) {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required Discord role environment variables: ${missingKeys.join(", ")}`,
    );
  }

  return {
    DISCORD_ROLE_ID_BROTHER: discordRolesEnv.DISCORD_ROLE_ID_BROTHER as string,
    DISCORD_ROLE_ID_CABINET: discordRolesEnv.DISCORD_ROLE_ID_CABINET as string,
    DISCORD_ROLE_ID_HOUSING_CHAIR:
      discordRolesEnv.DISCORD_ROLE_ID_HOUSING_CHAIR as string,
  };
}

const requiredRoles = resolveRequiredRoles();

// Discord Role IDs (Snowflakes)
// Fail fast on missing config so role-based authorization never silently degrades.
export const ROLES = {
  // Base Roles
  BROTHER: requiredRoles.DISCORD_ROLE_ID_BROTHER,

  // Officers & Committee Chairs
  CABINET: requiredRoles.DISCORD_ROLE_ID_CABINET,
  HOUSING_CHAIR: requiredRoles.DISCORD_ROLE_ID_HOUSING_CHAIR,
  DEV: requiredRoles.DISCORD_ROLE_ID_CABINET,
} as const;

export type RoleKey = string; // IDs are strings

// Roles allowed to access the Library (Search & Download)
// Logic: Brother OR any officer role
export const LIBRARY_ACCESS_ROLES: string[] = [
  ROLES.BROTHER,
  ROLES.CABINET,
  ROLES.HOUSING_CHAIR,
  ROLES.DEV,
];

// Roles allowed to Manage Assignments (Housing)
export const HOUSING_ADMIN_ROLES: string[] = [
  ROLES.HOUSING_CHAIR,
  ROLES.CABINET,
  ROLES.DEV,
];
