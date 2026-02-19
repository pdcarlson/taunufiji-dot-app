import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Environment Configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
  });

  it("should fail validation if required Appwrite variables are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT", "");
    
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Dynamically import to trigger validation
    const { env } = await import("@/lib/infrastructure/config/env");
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should throw an error in production if validation fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT", "");
    
    vi.spyOn(console, "error").mockImplementation(() => {});
    
    await expect(import("@/lib/infrastructure/config/env")).rejects.toThrow(
      "Critical environment variables are missing in production."
    );
  });
});
