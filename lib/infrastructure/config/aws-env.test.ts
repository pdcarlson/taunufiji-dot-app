const AWS_ENV_KEYS = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_BUCKET_NAME",
] as const;

describe("AWS Environment Configuration", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
    AWS_ENV_KEYS.forEach((key) => delete process.env[key]);
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

  it("should fail validation when AWS variables are missing", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(import("@/lib/infrastructure/config/aws-env")).rejects.toThrow(
      /Invalid AWS environment variables/,
    );

    expect(consoleSpy).toHaveBeenCalled();
  });

  it("should validate and export AWS variables", async () => {
    process.env.AWS_REGION = "us-east-1";
    process.env.AWS_ACCESS_KEY_ID = "test-access";
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
    process.env.AWS_BUCKET_NAME = "test-bucket";

    const { awsEnv } = await import("@/lib/infrastructure/config/aws-env");

    expect(awsEnv.AWS_REGION).toBe("us-east-1");
    expect(awsEnv.AWS_ACCESS_KEY_ID).toBe("test-access");
    expect(awsEnv.AWS_SECRET_ACCESS_KEY).toBe("test-secret");
    expect(awsEnv.AWS_BUCKET_NAME).toBe("test-bucket");
  });
});
