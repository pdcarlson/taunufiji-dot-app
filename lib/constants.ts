import { env } from "./infrastructure/config/env";

export const APPWRITE_PROJECT_ID = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
export const COOKIE_SESSION_NAME = `a_session_${APPWRITE_PROJECT_ID}`;
