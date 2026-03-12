import { config as loadDotEnv } from "dotenv";
import { Client, Databases, Query } from "node-appwrite";
import { DB_ID, COLLECTIONS } from "@/lib/infrastructure/config/schema";
import {
  readServerEnv,
  serverEnvSchema,
  ServerEnv,
} from "@/lib/infrastructure/config/server-env-schema";

type DiagnosticResult = {
  check: string;
  passed: boolean;
  detail: string;
};

const DISCORD_API = "https://discord.com/api/v10";
const DISCORD_REQUEST_TIMEOUT_MS = 8_000;

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function runAppwriteChecks(client: Databases): Promise<DiagnosticResult[]> {
  const checks: DiagnosticResult[] = [];

  try {
    await client.listDocuments(DB_ID, COLLECTIONS.USERS, [Query.limit(1)]);
    checks.push({
      check: "Appwrite users collection read",
      passed: true,
      detail: `${DB_ID}.${COLLECTIONS.USERS} is readable`,
    });
  } catch (error) {
    checks.push({
      check: "Appwrite users collection read",
      passed: false,
      detail: safeErrorMessage(error),
    });
  }

  try {
    await client.listDocuments(DB_ID, COLLECTIONS.ASSIGNMENTS, [Query.limit(1)]);
    checks.push({
      check: "Appwrite assignments collection read",
      passed: true,
      detail: `${DB_ID}.${COLLECTIONS.ASSIGNMENTS} is readable`,
    });
  } catch (error) {
    checks.push({
      check: "Appwrite assignments collection read",
      passed: false,
      detail: safeErrorMessage(error),
    });
  }

  return checks;
}

async function runDiscordChecks(
  env: Pick<
    ServerEnv,
    | "DISCORD_BOT_TOKEN"
    | "DISCORD_GUILD_ID"
    | "DISCORD_HOUSING_CHANNEL_ID"
    | "DISCORD_ROLE_ID_BROTHER"
    | "DISCORD_ROLE_ID_CABINET"
    | "DISCORD_ROLE_ID_HOUSING_CHAIR"
  >,
): Promise<DiagnosticResult[]> {
  const headers = {
    Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };

  const checks: DiagnosticResult[] = [];

  async function fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DISCORD_REQUEST_TIMEOUT_MS);

    try {
      return await fetch(url, {
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  function toDiscordErrorDetail(error: unknown): string {
    if (error instanceof Error && error.name === "AbortError") {
      return `Request timed out after ${DISCORD_REQUEST_TIMEOUT_MS}ms`;
    }
    return safeErrorMessage(error);
  }

  try {
    const guildRes = await fetchWithTimeout(
      `${DISCORD_API}/guilds/${env.DISCORD_GUILD_ID}`,
    );
    if (!guildRes.ok) {
      checks.push({
        check: "Discord guild access",
        passed: false,
        detail: `HTTP ${guildRes.status} while reading guild`,
      });
    } else {
      checks.push({
        check: "Discord guild access",
        passed: true,
        detail: `Guild ${env.DISCORD_GUILD_ID} is reachable`,
      });
    }
  } catch (error) {
    checks.push({
      check: "Discord guild access",
      passed: false,
      detail: toDiscordErrorDetail(error),
    });
  }

  try {
    const channelRes = await fetchWithTimeout(
      `${DISCORD_API}/channels/${env.DISCORD_HOUSING_CHANNEL_ID}`,
    );
    if (!channelRes.ok) {
      checks.push({
        check: "Discord housing channel access",
        passed: false,
        detail: `HTTP ${channelRes.status} while reading channel`,
      });
    } else {
      checks.push({
        check: "Discord housing channel access",
        passed: true,
        detail: `Channel ${env.DISCORD_HOUSING_CHANNEL_ID} is reachable`,
      });
    }
  } catch (error) {
    checks.push({
      check: "Discord housing channel access",
      passed: false,
      detail: toDiscordErrorDetail(error),
    });
  }

  try {
    const rolesRes = await fetchWithTimeout(
      `${DISCORD_API}/guilds/${env.DISCORD_GUILD_ID}/roles`,
    );
    if (!rolesRes.ok) {
      checks.push({
        check: "Discord role mapping",
        passed: false,
        detail: `HTTP ${rolesRes.status} while reading guild roles`,
      });
    } else {
      const roles = (await rolesRes.json()) as { id: string; name: string }[];
      const roleIds = new Set(roles.map((role) => role.id));
      const requiredRoles = [
        { key: "DISCORD_ROLE_ID_BROTHER", id: env.DISCORD_ROLE_ID_BROTHER },
        { key: "DISCORD_ROLE_ID_CABINET", id: env.DISCORD_ROLE_ID_CABINET },
        {
          key: "DISCORD_ROLE_ID_HOUSING_CHAIR",
          id: env.DISCORD_ROLE_ID_HOUSING_CHAIR,
        },
      ];
      const missing = requiredRoles.filter((role) => !roleIds.has(role.id));

      checks.push({
        check: "Discord role mapping",
        passed: missing.length === 0,
        detail:
          missing.length === 0
            ? "Configured housing role IDs exist in the guild"
            : `Missing role IDs: ${missing.map((role) => role.key).join(", ")}`,
      });
    }
  } catch (error) {
    checks.push({
      check: "Discord role mapping",
      passed: false,
      detail: toDiscordErrorDetail(error),
    });
  }

  return checks;
}

async function main(): Promise<void> {
  loadDotEnv({ path: ".env.local", override: false });
  const parsed = serverEnvSchema.safeParse(readServerEnv());
  if (!parsed.success) {
    const invalidKeys = Object.keys(parsed.error.flatten().fieldErrors);
    console.error(
      `Environment validation failed for diagnostics. Missing/invalid keys: ${invalidKeys.join(", ")}`,
    );
    process.exit(1);
  }
  const env = parsed.data;
  const endpointHost = new URL(env.NEXT_PUBLIC_APPWRITE_ENDPOINT).host;

  console.log("🔎 Running staging diagnostics");
  console.log(`   NODE_ENV: ${env.NODE_ENV}`);
  console.log(`   Appwrite endpoint host: ${endpointHost}`);
  console.log(`   Appwrite project id: ${env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`);

  const appwriteClient = new Client()
    .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);

  const databases = new Databases(appwriteClient);

  const results: DiagnosticResult[] = [
    ...(await runAppwriteChecks(databases)),
    ...(await runDiscordChecks(env)),
  ];

  const failures = results.filter((result) => !result.passed);
  for (const result of results) {
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} ${result.check}: ${result.detail}`);
  }

  if (failures.length > 0) {
    console.error(
      `\nStaging diagnostics failed (${failures.length} failing checks).`,
    );
    process.exit(1);
  }

  console.log("\nAll staging diagnostics passed.");
}

main().catch((error) => {
  console.error("Diagnostic failed:", error);
  process.exit(1);
});
