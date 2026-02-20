import { clientEnv } from "./infrastructure/config/client-env";

// Branding
export const APP_NAME = "Tau Nu Fiji";
export const APP_DESCRIPTION = "The official portal for the Tau Nu Chapter of Phi Gamma Delta at Rensselaer Polytechnic Institute.";
export const BASE_URL = clientEnv.NEXT_PUBLIC_APP_URL;

// Infrastructure
export const APPWRITE_PROJECT_ID = clientEnv.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const APPWRITE_ENDPOINT = clientEnv.NEXT_PUBLIC_APPWRITE_ENDPOINT;
export const COOKIE_SESSION_NAME = `a_session_${APPWRITE_PROJECT_ID}`;

// Housing Domain Constants
export const HOUSING_CONSTANTS = {
  FINE_MISSING_DUTY: 5, // Fallback since it's not in env
  DEFAULT_LEAD_TIME_HOURS: 24, // Fallback since it's not in env
  URGENT_THRESHOLD_HOURS: 12,
  RECENT_TASK_THRESHOLD_DAYS: 7,
} as const;

export const LEDGER_CONSTANTS = {
  HISTORY_LIMIT: 50,
  DEFAULT_LEADERBOARD_LIMIT: 20,
} as const;
