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
  const mockStorageService = {
    getReadUrl: vi.fn().mockResolvedValue("https://S3-URL"),
    getUploadUrl: vi.fn().mockResolvedValue("https://S3-UPLOAD-URL"),
    uploadFile: vi.fn(),
    copyObject: vi.fn().mockResolvedValue(undefined),
    deleteObject: vi.fn().mockResolvedValue(undefined),
  };
  const mockDomainEventPublisher = {
    publishLibraryUploaded: vi.fn().mockResolvedValue(undefined),
  };
  let service: LibraryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LibraryService(
      mockRepo,
      mockStorageService,
      mockDomainEventPublisher,
    );
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
    it("should delegate to repository with normalized filters", async () => {
      mockRepo.search = vi.fn().mockResolvedValue({ documents: [], total: 0 });
      const filters = { department: "  cs ", course_number: "1200", year: 2024 };

      await service.search(filters);

      expect(mockRepo.search).toHaveBeenCalledWith({
        department: "CS",
        course_number: "1200",
        year: 2024,
      });
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

  describe("finalizeUploadedResource", () => {
    it("copies temp key to final key, creates record, deletes temp, publishes event", async () => {
      mockRepo.ensureMetadata = vi.fn().mockResolvedValue(undefined);
      mockRepo.create = vi.fn().mockResolvedValue({ id: "doc-1" });

      const record = await service.finalizeUploadedResource({
        tempS3Key: "library/uploads/u/temp.pdf",
        standardizedFilename: "Final_Name.pdf",
        uploadedByDiscordId: "discord-1",
        department: "CSCI",
        course_number: "1200",
        course_name: "Intro",
        professor: "P",
        semester: "Spring",
        year: 2025,
        type: "Exam1",
        version: "Student",
      });

      expect(record).toEqual({ id: "doc-1" });
      expect(mockRepo.ensureMetadata).toHaveBeenCalled();
      expect(mockStorageService.copyObject).toHaveBeenCalledWith(
        "library/uploads/u/temp.pdf",
        "library/Final_Name.pdf",
      );
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file_s3_key: "library/Final_Name.pdf",
          original_filename: "Final_Name.pdf",
          uploaded_by: "discord-1",
        }),
      );
      expect(mockStorageService.deleteObject).toHaveBeenCalledWith(
        "library/uploads/u/temp.pdf",
      );
      expect(mockDomainEventPublisher.publishLibraryUploaded).toHaveBeenCalledWith(
        {
          userId: "discord-1",
          resourceId: "doc-1",
          fileName: "Final_Name.pdf",
        },
      );
    });

    it("on create failure, deletes promoted and temp keys", async () => {
      mockRepo.ensureMetadata = vi.fn().mockResolvedValue(undefined);
      mockRepo.create = vi.fn().mockRejectedValue(new Error("db down"));

      await expect(
        service.finalizeUploadedResource({
          tempS3Key: "library/uploads/u/temp.pdf",
          standardizedFilename: "x.pdf",
          uploadedByDiscordId: "d1",
          department: "CSCI",
          course_number: "1200",
          course_name: "Intro",
          professor: "P",
          semester: "Spring",
          year: 2025,
          type: "Exam1",
          version: "Student",
        }),
      ).rejects.toThrow("db down");

      expect(mockStorageService.deleteObject).toHaveBeenCalledWith(
        "library/x.pdf",
      );
      expect(mockStorageService.deleteObject).toHaveBeenCalledWith(
        "library/uploads/u/temp.pdf",
      );
      expect(mockDomainEventPublisher.publishLibraryUploaded).not.toHaveBeenCalled();
    });
  });
});
