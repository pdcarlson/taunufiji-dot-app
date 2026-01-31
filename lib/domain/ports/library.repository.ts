import { LibraryResource } from "../entities/models";

export interface LibrarySearchFilters {
  department?: string;
  course_number?: string;
  professor?: string;
  year?: number;
}

export interface CreateResourceParams {
  department: string;
  course_number: string;
  course_name: string;
  professor: string;
  semester: string;
  year: number;
  type: string;
  version: string;
  original_filename: string;
  file_s3_key: string;
  uploaded_by: string;
}

export interface LibraryMetadata {
  courses: Record<string, { number: string; name: string }[]>;
  professors: string[];
}

export interface ILibraryRepository {
  /**
   * Search for library resources
   */
  search(filters: LibrarySearchFilters): Promise<{
    documents: LibraryResource[];
    total: number;
  }>;

  /**
   * Find a resource by ID
   */
  findById(id: string): Promise<LibraryResource | null>;

  /**
   * Create a new resource
   */
  create(data: CreateResourceParams): Promise<LibraryResource>;

  /**
   * Check if a resource already exists
   */
  exists(criteria: {
    department: string;
    course_number: string;
    type: string;
    semester: string;
    year: number;
    version: string;
  }): Promise<boolean>;

  /**
   * Get global or user-specific stats
   */
  getStats(userId?: string): Promise<{ totalFiles: number; userFiles: number }>;

  /**
   * Get metadata for search dropdowns (Courses, Professors)
   */
  getMetadata(): Promise<LibraryMetadata>;

  /**
   * Ensure course and professor metadata exists
   */
  ensureMetadata(data: {
    department: string;
    course_number: string;
    course_name: string;
    professor: string;
  }): Promise<void>;
}
