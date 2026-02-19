import { env } from "./infrastructure/config/env";

// Branding
export const APP_NAME = env.NEXT_PUBLIC_APP_NAME;
export const APP_DESCRIPTION = env.NEXT_PUBLIC_APP_DESCRIPTION;
export const BASE_URL = env.NEXT_PUBLIC_APP_URL;

// Infrastructure
export const APPWRITE_PROJECT_ID = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const APPWRITE_ENDPOINT = env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
export const COOKIE_SESSION_NAME = `a_session_${APPWRITE_PROJECT_ID}`;

// Housing Domain Constants
export const HOUSING_CONSTANTS = {
  FINE_MISSING_DUTY: env.FINE_AMOUNT_MISSING_DUTY,
  DEFAULT_LEAD_TIME_HOURS: env.DEFAULT_TASK_LEAD_TIME,
  RECENT_TASK_THRESHOLD_DAYS: 7,
} as const;

export const LEDGER_CONSTANTS = {
  HISTORY_LIMIT: 50,
  DEFAULT_LEADERBOARD_LIMIT: 20,
} as const;
