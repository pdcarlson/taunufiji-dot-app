const SERVER_ENV_KEYS = [
  "NODE_ENV",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APPWRITE_ENDPOINT",
  "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_BUCKET_NAME",
  "DISCORD_APP_ID",
  "DISCORD_PUBLIC_KEY",
  "DISCORD_BOT_TOKEN",
  "DISCORD_GUILD_ID",
  "DISCORD_HOUSING_CHANNEL_ID",
  "DISCORD_ROLE_ID_BROTHER",
  "DISCORD_ROLE_ID_CABINET",
  "DISCORD_ROLE_ID_HOUSING_CHAIR",
  "CRON_SECRET",
] as const;

describe("Environment Configuration", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
    SERVER_ENV_KEYS.forEach((key) => delete process.env[key]);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("should fail validation if required Appwrite variables are missing", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(import("@/lib/infrastructure/config/env")).rejects.toThrow(
      /Invalid server environment variables/,
    );

    expect(consoleSpy).toHaveBeenCalled();
  });

  it("should validate and export correctly when all variables are present", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = "http://localhost/v1";
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID = "test-project";
    process.env.APPWRITE_API_KEY = "test-key";
    process.env.AWS_REGION = "test-region";
    process.env.AWS_ACCESS_KEY_ID = "test-access";
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
    process.env.AWS_BUCKET_NAME = "test-bucket";
    process.env.DISCORD_APP_ID = "test-app";
    process.env.DISCORD_PUBLIC_KEY = "test-public";
    process.env.DISCORD_BOT_TOKEN = "test-token";
    process.env.DISCORD_GUILD_ID = "test-guild";
    process.env.DISCORD_HOUSING_CHANNEL_ID = "test-housing";
    process.env.DISCORD_ROLE_ID_BROTHER = "test-role-brother";
    process.env.DISCORD_ROLE_ID_CABINET = "test-role-cabinet";
    process.env.DISCORD_ROLE_ID_HOUSING_CHAIR = "test-role-housing";
    process.env.CRON_SECRET = "test-secret";

    const { env } = await import("@/lib/infrastructure/config/env");

    expect(env.NEXT_PUBLIC_APPWRITE_ENDPOINT).toBe("http://localhost/v1");
    expect(env.DISCORD_HOUSING_CHANNEL_ID).toBe("test-housing");
  });
});
