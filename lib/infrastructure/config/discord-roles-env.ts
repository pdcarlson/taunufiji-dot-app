import "server-only";
import { z } from "zod";

const discordRolesEnvSchema = z.object({
  DISCORD_ROLE_ID_BROTHER: z.string().min(1),
  DISCORD_ROLE_ID_CABINET: z.string().min(1),
  DISCORD_ROLE_ID_HOUSING_CHAIR: z.string().min(1),
});

export type DiscordRolesEnv = z.infer<typeof discordRolesEnvSchema>;

function readDiscordRolesEnv(source: NodeJS.ProcessEnv = process.env): {
  [K in keyof DiscordRolesEnv]: string | undefined;
} {
  return {
    DISCORD_ROLE_ID_BROTHER: source.DISCORD_ROLE_ID_BROTHER,
    DISCORD_ROLE_ID_CABINET: source.DISCORD_ROLE_ID_CABINET,
    DISCORD_ROLE_ID_HOUSING_CHAIR: source.DISCORD_ROLE_ID_HOUSING_CHAIR,
  };
}

const skipValidation = process.env.SKIP_ENV_VALIDATION === "true";
const parsed = discordRolesEnvSchema.safeParse(readDiscordRolesEnv());

if (!parsed.success && !skipValidation) {
  const invalidKeys = Object.keys(parsed.error.flatten().fieldErrors);
  console.error(
    "Discord role environment validation failed:",
    parsed.error.format(),
  );
  throw new Error(
    `Invalid Discord role environment variables: ${
      invalidKeys.length > 0 ? invalidKeys.join(", ") : "unknown"
    }`,
  );
}

function resolveSkipValidationEnv(): DiscordRolesEnv {
  const rawEnv = readDiscordRolesEnv();
  const parsedWithValidation = discordRolesEnvSchema.safeParse(rawEnv);

  if (parsedWithValidation.success) {
    return parsedWithValidation.data;
  }

  console.warn(
    `⚠️ SKIP_ENV_VALIDATION=true enabled for Discord roles; using raw process.env fallback. Reason: ${parsedWithValidation.error.message}`,
  );
  return rawEnv as DiscordRolesEnv;
}

export const discordRolesEnv = skipValidation
  ? resolveSkipValidationEnv()
  : (parsed.data as DiscordRolesEnv);
