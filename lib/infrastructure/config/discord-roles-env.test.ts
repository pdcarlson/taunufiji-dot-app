const DISCORD_ROLE_ENV_KEYS = [
  "DISCORD_ROLE_ID_BROTHER",
  "DISCORD_ROLE_ID_CABINET",
  "DISCORD_ROLE_ID_HOUSING_CHAIR",
] as const;

describe("Discord Role Environment Configuration", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
    for (const key of DISCORD_ROLE_ENV_KEYS) {
      delete process.env[key];
    }
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

  it("should fail validation when role variables are missing", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      import("@/lib/infrastructure/config/discord-roles-env"),
    ).rejects.toThrow(/Invalid Discord role environment variables/);

    expect(consoleSpy).toHaveBeenCalled();
  });

  it("should validate and export all role variables", async () => {
    process.env.DISCORD_ROLE_ID_BROTHER = "test-role-brother";
    process.env.DISCORD_ROLE_ID_CABINET = "test-role-cabinet";
    process.env.DISCORD_ROLE_ID_HOUSING_CHAIR = "test-role-housing";

    const { discordRolesEnv } =
      await import("@/lib/infrastructure/config/discord-roles-env");

    expect(discordRolesEnv.DISCORD_ROLE_ID_BROTHER).toBe("test-role-brother");
    expect(discordRolesEnv.DISCORD_ROLE_ID_CABINET).toBe("test-role-cabinet");
    expect(discordRolesEnv.DISCORD_ROLE_ID_HOUSING_CHAIR).toBe(
      "test-role-housing",
    );
  });
});
