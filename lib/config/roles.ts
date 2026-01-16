
// Discord Role IDs (Snowflakes)
export const ROLES = {
  // Base Roles
  BROTHER: "750151182395244584", // @Brothers

  // Officers & Committee Chairs
  CABINET: "1148288953745686538",
  HOUSING_CHAIR: "750354822452215880",
  SCHOLARSHIP_CHAIR: "1070412676716564581",
  DEV: "1452422469209161904",
  
} as const;

export type RoleKey = typeof ROLES[keyof typeof ROLES];

// Roles allowed to access the Library (Search & Download)
// Logic: Brother OR any officer role
export const LIBRARY_ACCESS_ROLES: RoleKey[] = [
  ROLES.BROTHER,
  ROLES.CABINET,
  ROLES.HOUSING_CHAIR,
  ROLES.SCHOLARSHIP_CHAIR,
  ROLES.DEV,
];

// Roles allowed to Manage Assignments (Housing)
export const HOUSING_ADMIN_ROLES: RoleKey[] = [
  ROLES.HOUSING_CHAIR,
  ROLES.CABINET,
  ROLES.DEV,
];
