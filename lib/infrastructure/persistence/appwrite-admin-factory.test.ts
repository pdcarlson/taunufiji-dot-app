import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createAppwriteAdminClientFromEnv } from "./appwrite-admin-factory";

describe("createAppwriteAdminClientFromEnv", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT", "https://example.com/v1");
    vi.stubEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID", "proj");
    vi.stubEnv("APPWRITE_API_KEY", "key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when required vars are missing", () => {
    vi.stubEnv("APPWRITE_API_KEY", "");
    expect(() => createAppwriteAdminClientFromEnv()).toThrow(
      /NEXT_PUBLIC_APPWRITE_ENDPOINT/,
    );
  });

  it("returns a configured Client", () => {
    const client = createAppwriteAdminClientFromEnv();
    expect(client).toBeDefined();
  });
});
