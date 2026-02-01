import { StorageService } from "@/lib/infrastructure/storage/storage";
import {
  ILibraryRepository,
  LibrarySearchFilters,
  CreateResourceParams,
} from "@/lib/domain/ports/library.repository";

export type { LibrarySearchFilters, CreateResourceParams };

export class LibraryService {
  constructor(private readonly libraryRepository: ILibraryRepository) {}

  /**
   * Searches the Library metadata collection.
   */
  async search(filters: LibrarySearchFilters) {
    return await this.libraryRepository.search(filters);
  }

  /**
   * Generates a Secure S3 Download Link for a given file ID.
   */
  async getDownloadLink(documentId: string) {
    // 1. Fetch Metadata to get S3 Key
    const doc = await this.libraryRepository.findById(documentId);

    if (!doc) throw new Error("Document not found");
    const fileData = doc;

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
  }

  /**
   * Gets library statistics (total files and user contributions).
   */
  async getStats(userId?: string) {
    return await this.libraryRepository.getStats(userId);
  }

  /**
   * Fetches dropdown metadata (Courses, Professors)
   */
  async getSearchMetadata() {
    return await this.libraryRepository.getMetadata();
  }

  /**
   * Creates a new Library Resource
   */
  async createResource(data: CreateResourceParams) {
    return await this.libraryRepository.create(data);
  }

  /**
   * Ensures Course and Professor exist; creates if not.
   */
  async ensureMetadata(data: {
    department: string;
    course_number: string;
    course_name: string;
    professor: string;
  }) {
    return await this.libraryRepository.ensureMetadata(data);
  }

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
    return await this.libraryRepository.exists(criteria);
  }
}
