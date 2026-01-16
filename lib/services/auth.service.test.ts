import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthService } from "./auth.service";
import { ROLES, LIBRARY_ACCESS_ROLES } from "../config/roles";

// Mock Env to bypass Zod validation
vi.mock("../config/env", () => ({
  env: {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: "http://localhost/v1",
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: "test-project",
    APPWRITE_API_KEY: "test-key",
  },
}));

// 1. Mock Node-Appwrite
const mocks = vi.hoisted(() => ({
  mockListIdentities: vi.fn(),
  mockUpdateName: vi.fn(),
  mockListDocuments: vi.fn(),
  mockCreateDocument: vi.fn(),
  mockUpdateDocument: vi.fn(),
}));

vi.mock("node-appwrite", () => {
  return {
    Client: class {
      setEndpoint = vi.fn().mockReturnThis();
      setProject = vi.fn().mockReturnThis();
      setKey = vi.fn().mockReturnThis();
    },
    Users: class {
      listIdentities = mocks.mockListIdentities;
      updateName = mocks.mockUpdateName;
    },
    Databases: class {
      listDocuments = mocks.mockListDocuments;
      createDocument = mocks.mockCreateDocument;
      updateDocument = mocks.mockUpdateDocument;
      getDocument = vi.fn();
    },
    Query: {
      equal: vi.fn(),
      limit: vi.fn(),
    },
    ID: {
      unique: vi.fn(),
    },
  };
});

// 2. Mock Global Fetch (Discord API)
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DISCORD_GUILD_ID", "test_guild");
    vi.stubEnv("DISCORD_BOT_TOKEN", "test_token");

    // Default Fetch Success Mock (Discord Member)
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: { username: "testuser", global_name: "Test Global" },
        nick: "Brother Test",
        roles: ["123456789", "987654321"],
      }),
      headers: { get: () => null },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("verifyRole", () => {
    it("should return true if user has one of the allowed roles", async () => {
      // Mock Appwrite Identity
      mocks.mockListIdentities.mockResolvedValue({
        identities: [
          { provider: "discord", providerUid: "discord_valid_role" },
        ],
      });

      // Mock Discord Roles (Success)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roles: ["123", "TARGET_ROLE_ID"] }),
      });

      const result = await AuthService.verifyRole("auth_1", [
        "TARGET_ROLE_ID",
        "OTHER_ROLE",
      ]);
      expect(result).toBe(true);
    });

    it("should return false if user has none of the allowed roles", async () => {
      mocks.mockListIdentities.mockResolvedValue({
        identities: [
          { provider: "discord", providerUid: "discord_invalid_role" },
        ],
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roles: ["random_role"] }),
      });

      const result = await AuthService.verifyRole("auth_2", ["TARGET_ROLE_ID"]);
      expect(result).toBe(false);
    });

    it("should return false if Discord Identity is missing", async () => {
      mocks.mockListIdentities.mockResolvedValue({
        identities: [],
      });

      const result = await AuthService.verifyRole("auth_123", ["any"]);
      expect(result).toBe(false);
    });
  });

  describe("syncUser", () => {
    it("should create a NEW user profile if one does not exist", async () => {
      // 1. Mock Identity
      mocks.mockListIdentities.mockResolvedValue({
        identities: [{ provider: "discord", providerUid: "discord_new" }],
      });

      // 2. Mock DB (User not found)
      mocks.mockListDocuments.mockResolvedValue({ documents: [] });

      await AuthService.syncUser("auth_new");

      // Expect CreateDocument with correct payload
      expect(mocks.mockCreateDocument).toHaveBeenCalledWith(
        expect.any(String), // DB_ID
        expect.any(String), // COLLECTIONS.USERS
        "discord_new",
        expect.objectContaining({
          auth_id: "auth_new",
          discord_id: "discord_new",
          // Validate our Safety Fix
          position_key: "none",
          status: "active",
        })
      );
    });

    it("should UPDATE existing user profile if name changed", async () => {
      // 1. Mock Identity
      mocks.mockListIdentities.mockResolvedValue({
        identities: [{ provider: "discord", providerUid: "discord_old" }],
      });

      // 2. Mock DB (User FOUND)
      mocks.mockListDocuments.mockResolvedValue({
        documents: [
          {
            $id: "doc_1",
            discord_handle: "old_handle",
            full_name: "Old Name",
          },
        ],
      });

      // Mock Discord returning NEW name
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { username: "new_handle" },
          nick: "New Name",
        }),
      });

      await AuthService.syncUser("auth_old");

      expect(mocks.mockUpdateDocument).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "doc_1",
        expect.objectContaining({
          discord_handle: "new_handle",
          full_name: "New Name",
        })
      );
    });
  });
});
