import { describe, it, expect, vi, beforeEach } from "vitest";
import { PointsService } from "./points.service";

const mocks = vi.hoisted(() => ({
  mockUpdateDocument: vi.fn(),
  mockCreateDocument: vi.fn(),
  mockListDocuments: vi.fn(),
  mockGetDocument: vi.fn(),
}));

vi.mock("node-appwrite", () => {
  return {
    Client: class {
      setEndpoint = vi.fn().mockReturnThis();
      setProject = vi.fn().mockReturnThis();
      setKey = vi.fn().mockReturnThis();
    },
    Databases: class {
      updateDocument = mocks.mockUpdateDocument;
      createDocument = mocks.mockCreateDocument;
      listDocuments = mocks.mockListDocuments;
      getDocument = mocks.mockGetDocument;
    },
    Query: {
      equal: vi.fn(),
      orderDesc: vi.fn(),
    },
    ID: {
      unique: vi.fn().mockReturnValue("unique_id"),
    },
  };
});

// Mock Env
vi.mock("../config/env", () => ({
  env: {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: "http://localhost/v1",
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: "test-project",
    APPWRITE_API_KEY: "test-key",
  },
}));

// Mock Logger
vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

// Mock UserService
vi.mock("./user.service", () => ({
  UserService: {
    getByDiscordId: vi.fn(),
    // awardPoints now uses resolving? No, it takes profileId (Discord ID) usually.
    // Let's check points.service.ts source if needed.
    // Assuming it does:
    resolveUser: vi.fn(),
  },
}));

describe("PointsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should award points correctly", async () => {
    // Setup User State
    const mockUser = {
      $id: "user123",
      details_points_current: 50,
      details_points_lifetime: 100,
    };

    // Mock UserService Resolution (if used)
    // Actually, looking at points.service.ts (I assume), it probably calls `UserService.getByDiscordId(userId)`.
    const { UserService } = await import("./user.service");
    vi.mocked(UserService.getByDiscordId).mockResolvedValue(mockUser as any);
    // NOTE: If PointsService.awardPoints takes a "Discord ID", it resolves it.
    // If it takes a "Doc ID", it just updates.
    // Based on previous context, we moved to UserService resolution.

    await PointsService.awardPoints("user123", {
      amount: 10,
      reason: "Test Reason",
      category: "task",
    });

    // Expect User Update
    expect(mocks.mockUpdateDocument).toHaveBeenCalledWith(
      expect.any(String), // DB
      expect.any(String), // Collection
      "user123",
      {
        details_points_current: 60,
        details_points_lifetime: 110,
      },
    );

    // Expect Ledger Creation
    expect(mocks.mockCreateDocument).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        user_id: "user123", // Internal ID
        amount: 10,
        reason: "Test Reason",
      }),
    );
  });
});
