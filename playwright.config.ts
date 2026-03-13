import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://127.0.0.1:${PORT}`;

const E2E_ENV: Record<string, string> = {
  SKIP_ENV_VALIDATION: "true",
  NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://example.com",
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: "test-project",
  APPWRITE_API_KEY: "test-key",
  AWS_REGION: "test-region",
  AWS_ACCESS_KEY_ID: "test-access-key",
  AWS_SECRET_ACCESS_KEY: "test-secret-key",
  AWS_BUCKET_NAME: "test-bucket",
  DISCORD_APP_ID: "test-app-id",
  DISCORD_PUBLIC_KEY: "test-public-key",
  DISCORD_BOT_TOKEN: "test-bot-token",
  DISCORD_GUILD_ID: "test-guild-id",
  DISCORD_HOUSING_CHANNEL_ID: "test-channel-id",
  DISCORD_ROLE_ID_BROTHER: "test-role-brother",
  DISCORD_ROLE_ID_CABINET: "test-role-cabinet",
  DISCORD_ROLE_ID_HOUSING_CHAIR: "test-role-housing",
  CRON_SECRET: "test-cron-secret",
};

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `${baseURL}/login`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: E2E_ENV,
  },
});
