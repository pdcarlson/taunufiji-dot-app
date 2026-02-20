import { z } from "zod";

/**
 * Client-Safe Environment Configuration
 *
 * This module ONLY exposes NEXT_PUBLIC_* variables.
 * It is safe to import into client-side components and avoids
 * the "server-only" transitive imports from the main env.ts file.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.string().url(),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z.string().min(1),
});

const parsed = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
});

if (!parsed.success) {
  console.error("Client environment validation failed:", parsed.error.format());
  throw new Error("Invalid client environment variables");
}

export const clientEnv = parsed.data;
