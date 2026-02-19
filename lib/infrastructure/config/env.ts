import { z } from "zod";

/**
 * Environment Configuration
 * 
 * NEXT_PUBLIC_ variables are inlined by the Next.js compiler.
 * Server-only variables are only available in Node.js environments.
 */

const schema = z.object({
  NODE_ENV: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.string().min(1),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z.string().min(1),
  APPWRITE_API_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_BUCKET_NAME: z.string().optional(),
  DISCORD_APP_ID: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),
  ROLE_ID_BROTHER: z.string().optional(),
  ROLE_ID_CABINET: z.string().optional(),
  ROLE_ID_HOUSING_CHAIR: z.string().optional(),
  ROLE_ID_DEV: z.string().optional(),
});

// We must access process.env.NEXT_PUBLIC_... explicitly for the compiler
const parsed = schema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
  DISCORD_APP_ID: process.env.DISCORD_APP_ID,
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  ROLE_ID_BROTHER: process.env.ROLE_ID_BROTHER,
  ROLE_ID_CABINET: process.env.ROLE_ID_CABINET,
  ROLE_ID_HOUSING_CHAIR: process.env.ROLE_ID_HOUSING_CHAIR,
  ROLE_ID_DEV: process.env.ROLE_ID_DEV,
});

if (!parsed.success) {
  console.error("❌ Environment validation failed:", parsed.error.format());
  if (process.env.NODE_ENV === "production") {
    throw new Error("Critical environment variables are missing in production.");
  }
}

export const env = parsed.success ? parsed.data : (process.env as any);
