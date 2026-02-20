import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  
  // Appwrite
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.string().url(),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z.string().min(1),
  APPWRITE_API_KEY: z.string().min(1),

  // AWS S3
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_BUCKET_NAME: z.string().min(1),
  
  // Discord
  DISCORD_APP_ID: z.string().min(1),
  DISCORD_PUBLIC_KEY: z.string().min(1),
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  DISCORD_HOUSING_CHANNEL_ID: z.string().min(1),
  
  // Role IDs (Renamed to match .env format exactly)
  DISCORD_ROLE_ID_BROTHER: z.string().min(1),
  DISCORD_ROLE_ID_CABINET: z.string().min(1),
  DISCORD_ROLE_ID_HOUSING_CHAIR: z.string().min(1),

  // Domain Constants (Configurable per env)
  FINE_AMOUNT_MISSING_DUTY: z.coerce.number().default(50),
  DEFAULT_TASK_LEAD_TIME: z.coerce.number().default(24),
});

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
  DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY,
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  DISCORD_HOUSING_CHANNEL_ID: process.env.DISCORD_HOUSING_CHANNEL_ID,
  DISCORD_ROLE_ID_BROTHER: process.env.DISCORD_ROLE_ID_BROTHER,
  DISCORD_ROLE_ID_CABINET: process.env.DISCORD_ROLE_ID_CABINET,
  DISCORD_ROLE_ID_HOUSING_CHAIR: process.env.DISCORD_ROLE_ID_HOUSING_CHAIR,
  FINE_AMOUNT_MISSING_DUTY: process.env.FINE_AMOUNT_MISSING_DUTY,
  DEFAULT_TASK_LEAD_TIME: process.env.DEFAULT_TASK_LEAD_TIME,
});

if (!parsed.success) {
  console.error("❌ Environment validation failed:", parsed.error.format());
  throw new Error("Invalid environment variables");
}

/**
 * Validated Environment Object
 * (Server Only)
 */
export const env = parsed.data;
