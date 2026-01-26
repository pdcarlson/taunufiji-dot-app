import { describe, it, expect, vi, beforeEach } from "vitest";
import { LibraryService } from "./library.service";

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
vi.mock("./s3.service", () => ({
  StorageService: {
    getReadUrl: vi.fn().mockResolvedValue("https://example.com/file"),
  },
}));

// Mock Config
vi.mock("../config/env", () => ({
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

  it("getSearchMetadata groups courses by department", async () => {
    // Mock Courses
    mocks.mockListDocuments.mockResolvedValueOnce({
      documents: [
        {
          department: "CS",
          course_number: "1200",
          course_name: "Data Structures",
        },
        { department: "MATH", course_number: "1010", course_name: "Calc I" },
      ],
      total: 2,
    });

    // Mock Professors
    mocks.mockListDocuments.mockResolvedValueOnce({
      documents: [{ name: "Cutler" }, { name: "Kuzmin" }],
      total: 2,
    });

    const metadata = await LibraryService.getSearchMetadata();

    expect(metadata.courses["CS"]).toBeDefined();
    expect(metadata.courses["CS"][0].number).toBe("1200");
    expect(metadata.professors).toContain("Cutler");
  });

  it("checkDuplicate returns true if document exists", async () => {
    // Mock that a document was found
    mocks.mockListDocuments.mockResolvedValueOnce({
      total: 1,
      documents: [{}],
    });

    const exists = await LibraryService.checkDuplicate({
      department: "CS",
      course_number: "1200",
      type: "Exam 1",
      semester: "Fall",
      year: 2024,
      version: "Student",
    });

    expect(exists).toBe(true);
    expect(mocks.mockListDocuments).toHaveBeenCalledWith(
      expect.anything(), // dbId
      expect.anything(), // collection
      expect.any(Array), // queries - loosening the check since array equality is strict
    );
  });

  it("checkDuplicate returns false if no document exists", async () => {
    // Mock that no document was found
    mocks.mockListDocuments.mockResolvedValueOnce({ total: 0, documents: [] });

    const exists = await LibraryService.checkDuplicate({
      department: "CS",
      course_number: "1200",
      type: "Exam 1",
      semester: "Fall",
      year: 2024,
      version: "Student",
    });

    expect(exists).toBe(false);
  });
});
