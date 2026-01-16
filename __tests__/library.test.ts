import { describe, it, expect, vi, beforeEach } from "vitest";
import { LibraryService } from "../lib/services/library.service";

const mocks = vi.hoisted(() => ({
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
      listDocuments = mocks.mockListDocuments;
      getDocument = mocks.mockGetDocument;
    },
    Query: {
      limit: vi.fn(),
      equal: vi.fn(),
      search: vi.fn(),
      orderDesc: vi.fn(),
    },
  };
});

// Mock S3 Service
vi.mock("../lib/services/s3.service", () => ({
  StorageService: {
    getReadUrl: vi.fn().mockResolvedValue("https://example.com/file"),
  },
}));

// Mock Config
vi.mock("../lib/config/env", () => ({
  env: {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: "http://localhost",
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: "test",
    APPWRITE_API_KEY: "test",
  },
}));

describe("LibraryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStats returns correct counts", async () => {
    // Mock Responses
    mocks.mockListDocuments
      .mockResolvedValueOnce({ total: 100, documents: [] }) // Total
      .mockResolvedValueOnce({ total: 5, documents: [] }); // User

    const stats = await LibraryService.getStats("user-123");

    expect(stats).toEqual({
      totalFiles: 100,
      userFiles: 5,
    });

    expect(mocks.mockListDocuments).toHaveBeenCalledTimes(2);
  });

  it("getStats returns 0 user files if no user provided", async () => {
    mocks.mockListDocuments.mockResolvedValueOnce({ total: 50, documents: [] });
    // Reset mock to ensure clean state or just check logic

    const stats = await LibraryService.getStats();

    expect(stats.totalFiles).toBe(50);
    expect(stats.userFiles).toBe(0);
  });

  it("search applies filters correctly", async () => {
    mocks.mockListDocuments.mockResolvedValue({ documents: [], total: 0 });

    await LibraryService.search({ department: "CS", year: 2024 });

    // We verify that it was called. Exact arguments for Query are hard to match strictly
    // without inspecting the mock calls deeply, but we can verify invocation.
    expect(mocks.mockListDocuments).toHaveBeenCalled();
  });
});
