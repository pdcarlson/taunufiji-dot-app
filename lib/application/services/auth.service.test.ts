import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthService } from "./auth.service";
import { MockFactory } from "@/lib/test/mock-factory";
import { setContainer, resetContainer } from "@/lib/infrastructure/container";
import { Member } from "@/lib/domain/entities";

// Mock Env
vi.mock("@/lib/infrastructure/config/env", () => ({
  env: {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: "http://localhost/v1",
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: "test-project",
    APPWRITE_API_KEY: "test-key",
  },
}));

// Mock Global Fetch (Discord API)
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("AuthService", () => {
  const mockIdentity = MockFactory.createIdentityProvider();
  const mockUserRepo = MockFactory.createUserRepository();
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    resetContainer();
    setContainer({
      identityProvider: mockIdentity,
      userRepository: mockUserRepo,
    });

    vi.stubEnv("DISCORD_GUILD_ID", "test_guild");
    vi.stubEnv("DISCORD_BOT_TOKEN", "test_token");

    // Instantiate Service
    authService = new AuthService(mockUserRepo, mockIdentity);

    // Default Discord API Mock
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: { username: "testuser", global_name: "Test Global" },
        nick: "Brother Test",
        roles: ["role_1", "role_2"],
      }),
      headers: { get: () => null },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("verifyRole", () => {
    it("should return true if user has one of the allowed roles", async () => {
      // Setup Identity Logic
      mockIdentity.getIdentity = vi.fn().mockResolvedValue({
        userId: "auth_1",
        provider: "discord",
        providerUid: "discord_123",
      });

      // Setup Discord API Logic
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roles: ["target_role", "other_role"] }),
      });

      const result = await authService.verifyRole("auth_1", ["target_role"]);
      expect(result).toBe(true);
      expect(mockIdentity.getIdentity).toHaveBeenCalledWith(
        "auth_1",
        "discord",
      );
    });

    it("should return false if Identity Provider returns null (No Discord Link)", async () => {
      mockIdentity.getIdentity = vi.fn().mockResolvedValue(null);

      const result = await authService.verifyRole("auth_1", ["target_role"]);
      expect(result).toBe(false);
    });
  });

  describe("syncUser", () => {
    it("should create a NEW user profile if one does not exist", async () => {
      // 1. Identity Mock
      mockIdentity.getIdentity = vi.fn().mockResolvedValue({
        userId: "auth_new",
        provider: "discord",
        providerUid: "discord_new",
      });

      // 2. Repo Mock (Not Found)
      mockUserRepo.findByDiscordId = vi.fn().mockResolvedValue(null);
      mockUserRepo.create = vi.fn().mockResolvedValue({
        $id: "new_doc",
        auth_id: "auth_new",
      } as Member);

      await authService.syncUser("auth_new");

      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auth_id: "auth_new",
          discord_id: "discord_new",
        }),
      );
      expect(mockIdentity.updateName).toHaveBeenCalled(); // Implicitly called
    });

    it("should UPDATE existing user profile if name changed", async () => {
      // 1. Identity Mock
      mockIdentity.getIdentity = vi.fn().mockResolvedValue({
        userId: "auth_old",
        provider: "discord",
        providerUid: "discord_old",
      });

      // 2. Repo Mock (Found)
      const existingUser = {
        id: "doc_1", // Use id alias if base entity supports it, or $id. Using id as per clean arch.
        $id: "doc_1",
        auth_id: "auth_old",
        discord_handle: "old_handle",
        full_name: "old_name",
      } as unknown as Member;

      mockUserRepo.findByDiscordId = vi.fn().mockResolvedValue(existingUser);

      // 3. Discord Mock (New Name)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { username: "new_handle" },
          nick: "new_name",
        }),
      });

      await authService.syncUser("auth_old");

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        "doc_1",
        expect.objectContaining({
          discord_handle: "new_handle",
          full_name: "new_name",
        }),
      );
    });
  });
});
