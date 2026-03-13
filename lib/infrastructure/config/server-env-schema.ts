import { z } from "zod";

export const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),

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

  // Cron
  CRON_SECRET: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(source: NodeJS.ProcessEnv = process.env): {
  [K in keyof ServerEnv]: string | undefined;
} {
  return {
    NODE_ENV: source.NODE_ENV,
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APPWRITE_ENDPOINT: source.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: source.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY: source.APPWRITE_API_KEY,
    AWS_REGION: source.AWS_REGION,
    AWS_ACCESS_KEY_ID: source.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: source.AWS_SECRET_ACCESS_KEY,
    AWS_BUCKET_NAME: source.AWS_BUCKET_NAME,
    DISCORD_APP_ID: source.DISCORD_APP_ID,
    DISCORD_PUBLIC_KEY: source.DISCORD_PUBLIC_KEY,
    DISCORD_BOT_TOKEN: source.DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID: source.DISCORD_GUILD_ID,
    DISCORD_HOUSING_CHANNEL_ID: source.DISCORD_HOUSING_CHANNEL_ID,
    CRON_SECRET: source.CRON_SECRET,
  };
}
