import { Query, Models } from "node-appwrite";
import { getDatabase } from "@/lib/infrastructure/persistence";
import { DB_ID, COLLECTIONS } from "@/lib/domain/entities/schema";
import { StorageService } from "@/lib/infrastructure/storage/storage";

const db = getDatabase();

export interface LibrarySearchFilters {
  department?: string;
  course_number?: string;
  professor?: string;
  year?: number;
}

interface Course extends Models.Document {
  department: string;
  course_number: string;
  course_name: string;
  abbreviation: string;
}

interface Professor extends Models.Document {
  name: string;
}

export interface CreateResourceDTO {
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

export const LibraryService = {
  /**
   * Searches the Library metadata collection.
   */
  async search(filters: LibrarySearchFilters) {
    const queries = [Query.limit(50), Query.orderDesc("$createdAt")];

    if (filters.department && filters.department !== "All") {
      queries.push(Query.equal("department", filters.department));
    }
    if (filters.course_number && filters.course_number !== "All") {
      queries.push(Query.equal("course_number", filters.course_number));
    }
    if (filters.professor) {
      queries.push(Query.search("professor", filters.professor));
    }
    if (filters.year) {
      queries.push(Query.equal("year", filters.year));
    }

    const res = await db.listDocuments(DB_ID, COLLECTIONS.LIBRARY, queries);
    return {
      documents: res.documents,
      total: res.total,
    };
  },

  /**
   * Generates a Secure S3 Download Link for a given file ID.
   */
  async getDownloadLink(documentId: string) {
    // 1. Fetch Metadata to get S3 Key
    const doc = await db.getDocument(DB_ID, COLLECTIONS.LIBRARY, documentId);

    if (!doc.file_s3_key) {
      throw new Error("File S3 Key missing in metadata");
    }

    // 2. Generate Presigned URL
    // Pass filename to force "Save As" behavior with correct name
    const url = await StorageService.getReadUrl(
      doc.file_s3_key,
      doc.original_filename,
    );
    return { url, filename: doc.original_filename };
  },

  /**
   * Gets library statistics (total files and user contributions).
   */
  async getStats(userId?: string) {
    // 1. Total Count
    const totalDocs = await db.listDocuments(DB_ID, COLLECTIONS.LIBRARY, [
      Query.limit(1),
    ]);

    let userDocsTotal = 0;

    // 2. User Count (if userId provided)
    if (userId) {
      const userDocs = await db.listDocuments(DB_ID, COLLECTIONS.LIBRARY, [
        Query.equal("uploaded_by", userId),
        Query.limit(1),
      ]);
      userDocsTotal = userDocs.total;
    }

    return {
      totalFiles: totalDocs.total,
      userFiles: userDocsTotal,
    };
  },

  /**
   * Fetches dropdown metadata (Courses, Professors)
   */
  async getSearchMetadata() {
    try {
      // Fetch all courses
      // Note: If scale is large, this is bad. For now (<1000 courses), it's OK.
      // Appwrite default max limit is usually 100. Using 100 for safety.
      const coursesRes = await db.listDocuments(DB_ID, COLLECTIONS.COURSES, [
        Query.limit(100),
      ]);

      const professorsRes = await db.listDocuments(
        DB_ID,
        COLLECTIONS.PROFESSORS,
        [Query.limit(100)],
      );

      // Group courses by Dept
      const courses: Record<string, { number: string; name: string }[]> = {};

      // ...

      coursesRes.documents.forEach((doc: Models.Document) => {
        const c = doc as Course;
        const dept = c.department;
        if (!courses[dept]) courses[dept] = [];
        courses[dept].push({
          number: c.course_number,
          name: c.course_name,
        });
      });

      // Extract Professor Names
      const professors = professorsRes.documents
        .map((d: Models.Document) => (d as Professor).name)
        .sort();

      return { courses, professors };
    } catch (error) {
      console.error("[LibraryService] getSearchMetadata Failed:", error);
      throw error;
    }
  },

  /**
   * Creates a new Library Resource
   */
  async createResource(data: CreateResourceDTO) {
    return await db.createDocument(
      DB_ID,
      COLLECTIONS.LIBRARY,
      "unique()",
      data,
    );
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
    // 1. Check/Create Professor
    if (data.professor) {
      const profs = await db.listDocuments(DB_ID, COLLECTIONS.PROFESSORS, [
        Query.equal("name", data.professor),
      ]);
      if (profs.total === 0) {
        await db.createDocument(DB_ID, COLLECTIONS.PROFESSORS, "unique()", {
          name: data.professor,
        });
      }
    }

    // 2. Check/Create Course
    if (data.department && data.course_number) {
      const courses = await db.listDocuments(DB_ID, COLLECTIONS.COURSES, [
        Query.equal("department", data.department),
        Query.equal("course_number", data.course_number),
      ]);
      if (courses.total === 0) {
        await db.createDocument(DB_ID, COLLECTIONS.COURSES, "unique()", {
          department: data.department,
          course_number: data.course_number,
          course_name: data.course_name || "Unknown Course",
        });
      }
    }
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
    const queries = [
      Query.equal("department", criteria.department),
      Query.equal("course_number", criteria.course_number),
      Query.equal("type", criteria.type),
      Query.equal("semester", criteria.semester),
      Query.equal("year", criteria.year),
      Query.equal("version", criteria.version),
      Query.limit(1), // We only need to know if ONE exists
    ];

    const res = await db.listDocuments(DB_ID, COLLECTIONS.LIBRARY, queries);
    return res.total > 0;
  },
};
