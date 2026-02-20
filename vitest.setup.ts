import { expect, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Set required mock environment variables for tests so strict validation doesn't fail
(process.env as any).NODE_ENV = "test";
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

// Mock server-only to prevent it from throwing in tests
vi.mock("server-only", () => {
  return {};
});


vi.mock('@/lib/infrastructure/config/client-env', () => ({
  clientEnv: {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_APPWRITE_ENDPOINT: 'http://localhost/v1',
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: 'test-project',
  }
}));

