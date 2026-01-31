import { z } from "zod";

const envSchema = z.object({
  // Appwrite
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.string().url(),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z.string().min(1),
  APPWRITE_API_KEY: z.string().min(1).optional(), // Server-side only

  // AWS S3
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  AWS_BUCKET_NAME: z.string().min(1),

  // Discord
  DISCORD_APP_ID: z.string().min(1).optional(),
  DISCORD_PUBLIC_KEY: z.string().min(1).optional(),
  DISCORD_BOT_TOKEN: z.string().min(1).optional(),
  DISCORD_GUILD_ID: z.string().min(1).optional(),
  DISCORD_HOUSING_CHANNEL_ID: z.string().min(1).optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

// Validate process.env
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.format(), null, 4),
  );
  // In development, we might not want to crash immediately if just scaffolding, but ideally we do.
  // process.exit(1);
}

export const env = parsed.success ? parsed.data : (process.env as any);
