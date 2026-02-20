import { z } from "zod";

/**
 * Environment Configuration
 * 
 * NEXT_PUBLIC_ variables are inlined by the Next.js compiler.
 * Server-only variables are only available in Node.js environments.
 */

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  
  // Appwrite
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.string().min(1),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z.string().min(1),
  APPWRITE_API_KEY: z.string().optional(),
  
  // Sync Script (Source)
  SOURCE_APPWRITE_ENDPOINT: z.string().url().optional(),
  SOURCE_APPWRITE_PROJECT_ID: z.string().optional(),
  SOURCE_APPWRITE_API_KEY: z.string().optional(),

  // AWS S3
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_BUCKET_NAME: z.string().optional(),
  
  // Discord
  DISCORD_APP_ID: z.string().optional(),
  DISCORD_PUBLIC_KEY: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),
  DISCORD_HOUSING_CHANNEL_ID: z.string().optional(),
  
  // Role IDs
  ROLE_ID_BROTHER: z.string().optional(),
  ROLE_ID_CABINET: z.string().optional(),
  ROLE_ID_HOUSING_CHAIR: z.string().optional(),
  ROLE_ID_DEV: z.string().optional(),

  // Domain Constants (Configurable per env)
  FINE_AMOUNT_MISSING_DUTY: z.coerce.number().default(50),
  DEFAULT_TASK_LEAD_TIME: z.coerce.number().default(24),
});

// We must access process.env.NEXT_PUBLIC_... explicitly for the compiler
const parsed = schema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
  SOURCE_APPWRITE_ENDPOINT: process.env.SOURCE_APPWRITE_ENDPOINT,
  SOURCE_APPWRITE_PROJECT_ID: process.env.SOURCE_APPWRITE_PROJECT_ID,
  SOURCE_APPWRITE_API_KEY: process.env.SOURCE_APPWRITE_API_KEY,
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
  DISCORD_APP_ID: process.env.DISCORD_APP_ID,
  DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY,
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  DISCORD_HOUSING_CHANNEL_ID: process.env.DISCORD_HOUSING_CHANNEL_ID,
  ROLE_ID_BROTHER: process.env.ROLE_ID_BROTHER,
  ROLE_ID_CABINET: process.env.ROLE_ID_CABINET,
  ROLE_ID_HOUSING_CHAIR: process.env.ROLE_ID_HOUSING_CHAIR,
  ROLE_ID_DEV: process.env.ROLE_ID_DEV,
  FINE_AMOUNT_MISSING_DUTY: process.env.FINE_AMOUNT_MISSING_DUTY,
  DEFAULT_TASK_LEAD_TIME: process.env.DEFAULT_TASK_LEAD_TIME,
});

if (!parsed.success) {
  console.error("❌ Environment validation failed:", parsed.error.format());
  // Fail fast in production OR staging to prevent runtime magic number drift
  const currentEnv = process.env.NODE_ENV as string;
  if (currentEnv === "production" || currentEnv === "staging") {
    throw new Error(
      `Critical environment variables are missing or invalid in ${currentEnv}.`,
    );
  }
}

// Tolerant Re-parse for Fallback (preserves coercions/defaults for partial matches)
const fallback = schema.partial().safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  FINE_AMOUNT_MISSING_DUTY: process.env.FINE_AMOUNT_MISSING_DUTY,
  DEFAULT_TASK_LEAD_TIME: process.env.DEFAULT_TASK_LEAD_TIME,
});

/**
 * Validated Environment Object
 */
export const env = parsed.success
  ? parsed.data
  : ((fallback.success ? fallback.data : process.env) as unknown as z.infer<
      typeof schema
    >);

/**
 * Client-Safe Environment Wrapper
 * Only exposes variables intended for the browser.
 */
export const clientEnv = {
  NEXT_PUBLIC_APPWRITE_ENDPOINT: env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
};
