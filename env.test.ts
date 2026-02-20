import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

describe('Server Environment Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {}; // Clear env
  });

  it('should validate with valid variables', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = 'http://test';
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID = 'test';
    process.env.APPWRITE_API_KEY = 'test';
    process.env.AWS_REGION = 'test';
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';
    process.env.AWS_BUCKET_NAME = 'test';
    process.env.DISCORD_APP_ID = 'test';
    process.env.DISCORD_PUBLIC_KEY = 'test';
    process.env.DISCORD_BOT_TOKEN = 'test';
    process.env.DISCORD_GUILD_ID = 'test';
    process.env.DISCORD_HOUSING_CHANNEL_ID = 'test';
    process.env.DISCORD_ROLE_ID_BROTHER = 'test';
    process.env.DISCORD_ROLE_ID_CABINET = 'test';
    process.env.DISCORD_ROLE_ID_HOUSING_CHAIR = 'test';

    const { env } = await import('./env');
    expect(env.NEXT_PUBLIC_APPWRITE_ENDPOINT).toBe('http://test');
  });

  it('should throw an error if validation fails', async () => {
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = 'invalid-url';

    await expect(import('./env')).rejects.toThrow();
  });
});
