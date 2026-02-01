import { describe, it, expect, vi, beforeEach } from "vitest";
import { LibraryService } from "./library.service";
import { MockFactory } from "@/lib/test/mock-factory";

// Mock Storage Service (static)
vi.mock("@/lib/infrastructure/storage/storage", () => ({
  StorageService: {
    getReadUrl: vi.fn().mockResolvedValue("https://S3-URL"),
  },
}));

describe("LibraryService", () => {
  const mockRepo = MockFactory.createLibraryRepository();
  let service: LibraryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LibraryService(mockRepo);
  });

  describe("getStats", () => {
    it("should delegate to repository", async () => {
      mockRepo.getStats = vi.fn().mockResolvedValue({
        totalFiles: 100,
        userFiles: 5,
      });

      const stats = await service.getStats("user-123");

      expect(stats).toEqual({ totalFiles: 100, userFiles: 5 });
      expect(mockRepo.getStats).toHaveBeenCalledWith("user-123");
    });
  });

  describe("search", () => {
    it("should delegate to repository", async () => {
      mockRepo.search = vi.fn().mockResolvedValue({ documents: [], total: 0 });
      const filters = { department: "CS", year: 2024 };

      await service.search(filters);

      expect(mockRepo.search).toHaveBeenCalledWith(filters);
    });
  });

  describe("getDownloadLink", () => {
    it("should return presigned url if document has s3 key", async () => {
      mockRepo.findById = vi.fn().mockResolvedValue({
        id: "doc_1",
        file_s3_key: "key_123",
        original_filename: "notes.pdf",
      });

      const result = await service.getDownloadLink("doc_1");

      expect(result.url).toBe("https://S3-URL");
      expect(result.filename).toBe("notes.pdf");
    });

    it("should throw if document not found", async () => {
      mockRepo.findById = vi.fn().mockResolvedValue(null);
      await expect(service.getDownloadLink("bad_id")).rejects.toThrow(
        "not found",
      );
    });

    it("should throw if s3 key is missing", async () => {
      mockRepo.findById = vi.fn().mockResolvedValue({
        id: "doc_1",
        file_s3_key: null,
      });
      await expect(service.getDownloadLink("doc_1")).rejects.toThrow(
        "S3 Key missing",
      );
    });
  });

  describe("checkDuplicate", () => {
    it("should delegate to repository", async () => {
      const criteria = {
        department: "CS",
        course_number: "1200",
        type: "Exam 1",
        semester: "Fall",
        year: 2024,
        version: "Student",
      };
      mockRepo.exists = vi.fn().mockResolvedValue(true);

      const result = await service.checkDuplicate(criteria);

      expect(result).toBe(true);
      expect(mockRepo.exists).toHaveBeenCalledWith(criteria);
    });
  });

  describe("getSearchMetadata", () => {
    it("should delegate to repository", async () => {
      mockRepo.getMetadata = vi
        .fn()
        .mockResolvedValue({ courses: {}, professors: [] });
      await service.getSearchMetadata();
      expect(mockRepo.getMetadata).toHaveBeenCalled();
    });
  });
});
