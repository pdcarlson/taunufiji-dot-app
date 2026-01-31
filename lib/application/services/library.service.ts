import { getContainer } from "@/lib/infrastructure/container";
import { StorageService } from "@/lib/infrastructure/storage/storage";
import {
  LibrarySearchFilters,
  CreateResourceParams,
} from "@/lib/domain/ports/library.repository";

export type { LibrarySearchFilters, CreateResourceParams };

export const LibraryService = {
  /**
   * Searches the Library metadata collection.
   */
  async search(filters: LibrarySearchFilters) {
    const { libraryRepository } = getContainer();
    return await libraryRepository.search(filters);
  },

  /**
   * Generates a Secure S3 Download Link for a given file ID.
   */
  async getDownloadLink(documentId: string) {
    const { libraryRepository } = getContainer();

    // 1. Fetch Metadata to get S3 Key
    const doc = await libraryRepository.findById(documentId);

    if (!doc) throw new Error("Document not found");
    // Cast to access custom attributes
    const fileData = doc as typeof doc & {
      file_s3_key: string;
      original_filename: string;
    };

    if (!fileData.file_s3_key) {
      throw new Error("File S3 Key missing in metadata");
    }

    // 2. Generate Presigned URL
    // Pass filename to force "Save As" behavior with correct name
    const url = await StorageService.getReadUrl(
      fileData.file_s3_key,
      fileData.original_filename,
    );
    return { url, filename: fileData.original_filename };
  },

  /**
   * Gets library statistics (total files and user contributions).
   */
  async getStats(userId?: string) {
    const { libraryRepository } = getContainer();
    return await libraryRepository.getStats(userId);
  },

  /**
   * Fetches dropdown metadata (Courses, Professors)
   */
  async getSearchMetadata() {
    const { libraryRepository } = getContainer();
    return await libraryRepository.getMetadata();
  },

  /**
   * Creates a new Library Resource
   */
  async createResource(data: CreateResourceParams) {
    const { libraryRepository } = getContainer();
    return await libraryRepository.create(data);
  },

  /**
   * Ensures Course and Professor exist; creates if not.
   */
  async ensureMetadata(data: {
    department: string;
    course_number: string;
    course_name: string;
    professor: string;
  }) {
    const { libraryRepository } = getContainer();
    return await libraryRepository.ensureMetadata(data);
  },

  /**
   * Checks for duplicate resources to prevent double uploads.
   */
  async checkDuplicate(criteria: {
    department: string;
    course_number: string;
    type: string;
    semester: string;
    year: number;
    version: string;
  }) {
    const { libraryRepository } = getContainer();
    return await libraryRepository.exists(criteria);
  },
};
