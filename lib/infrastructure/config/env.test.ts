import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Environment Configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {}; // clear out the environment
  });

  it("should fail validation if required Appwrite variables are missing", async () => {
    // missing variables
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(import("@/lib/infrastructure/config/env")).rejects.toThrow(
      "Invalid server environment variables"
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should throw an error in production if validation fails", async () => {
    process.env.NODE_ENV = "production";

    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(import("@/lib/infrastructure/config/env")).rejects.toThrow(
      "Invalid server environment variables"
    );
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
    expect(env.DISCORD_ROLE_ID_BROTHER).toBe("test-role-brother");
  });
});
