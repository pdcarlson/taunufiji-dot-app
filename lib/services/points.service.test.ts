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

    // Mock Get User (via getDocument inside awardPoints? No, awardPoints calls db.getDocument on Users collection)
    // Wait, PointsService calls `db.getDocument(DB_ID, COLLECTIONS.USERS, userId)`.

    // Let's check PointsService implementation again.
    // It fetches user, adds points, updates user, creates ledger.

    // Mock Get User
    mocks.mockGetDocument.mockResolvedValue(mockUser);

    await PointsService.awardPoints("user123", {
      amount: 10,
      reason: "Test Reason",
      category: "task", // 'housing' was technically not in Enum, but 'task' is.
    });

    // Expect User Update
    expect(mocks.mockUpdateDocument).toHaveBeenCalledWith(
      expect.any(String), // DB
      expect.any(String), // Collection
      "user123",
      {
        details_points_current: 60,
        details_points_lifetime: 110,
      }
    );

    // Expect Ledger Creation
    expect(mocks.mockCreateDocument).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        user_id: "user123",
        amount: 10,
        reason: "Test Reason",
      })
    );
  });
});
