import { Query, Models } from "node-appwrite";
import { getDatabase } from "./client";
import { DB_ID, COLLECTIONS } from "@/lib/domain/entities/appwrite.schema";
import {
  ILibraryRepository,
  LibrarySearchFilters,
  CreateResourceParams,
  LibraryMetadata,
} from "@/lib/domain/ports/library.repository";
import { LibraryResource } from "@/lib/domain/entities";

interface Course extends Models.Document {
  department: string;
  course_number: string;
  course_name: string;
  abbreviation: string;
}

interface Professor extends Models.Document {
  name: string;
}

export class AppwriteLibraryRepository implements ILibraryRepository {
  private get db() {
    return getDatabase();
  }

  async findById(id: string): Promise<LibraryResource | null> {
    try {
      const doc = await this.db.getDocument(DB_ID, COLLECTIONS.LIBRARY, id);
      return doc as unknown as LibraryResource;
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

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

    const res = await this.db.listDocuments(
      DB_ID,
      COLLECTIONS.LIBRARY,
      queries,
    );
    return {
      documents: res.documents as unknown as LibraryResource[],
      total: res.total,
    };
  }

  async create(data: CreateResourceParams): Promise<LibraryResource> {
    const doc = await this.db.createDocument(
      DB_ID,
      COLLECTIONS.LIBRARY,
      "unique()",
      data,
    );
    return doc as unknown as LibraryResource;
  }

  async exists(criteria: {
    department: string;
    course_number: string;
    type: string;
    semester: string;
    year: number;
    version: string;
  }): Promise<boolean> {
    const queries = [
      Query.equal("department", criteria.department),
      Query.equal("course_number", criteria.course_number),
      Query.equal("type", criteria.type),
      Query.equal("semester", criteria.semester),
      Query.equal("year", criteria.year),
      Query.equal("version", criteria.version),
      Query.limit(1),
    ];

    const res = await this.db.listDocuments(
      DB_ID,
      COLLECTIONS.LIBRARY,
      queries,
    );
    return res.total > 0;
  }

  async getStats(
    userId?: string,
  ): Promise<{ totalFiles: number; userFiles: number }> {
    // 1. Total Count
    const totalDocs = await this.db.listDocuments(DB_ID, COLLECTIONS.LIBRARY, [
      Query.limit(1),
    ]);

    let userDocsTotal = 0;

    // 2. User Count
    if (userId) {
      const userDocs = await this.db.listDocuments(DB_ID, COLLECTIONS.LIBRARY, [
        Query.equal("uploaded_by", userId),
        Query.limit(1),
      ]);
      userDocsTotal = userDocs.total;
    }

    return {
      totalFiles: totalDocs.total,
      userFiles: userDocsTotal,
    };
  }

  async getMetadata(): Promise<LibraryMetadata> {
    const coursesRes = await this.db.listDocuments(DB_ID, COLLECTIONS.COURSES, [
      Query.limit(100),
    ]);

    const professorsRes = await this.db.listDocuments(
      DB_ID,
      COLLECTIONS.PROFESSORS,
      [Query.limit(100)],
    );

    // Group courses by Dept
    const courses: Record<string, { number: string; name: string }[]> = {};

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
  }

  async ensureMetadata(data: {
    department: string;
    course_number: string;
    course_name: string;
    professor: string;
  }): Promise<void> {
    // 1. Check/Create Professor
    if (data.professor) {
      const profs = await this.db.listDocuments(DB_ID, COLLECTIONS.PROFESSORS, [
        Query.equal("name", data.professor),
      ]);
      if (profs.total === 0) {
        await this.db.createDocument(
          DB_ID,
          COLLECTIONS.PROFESSORS,
          "unique()",
          {
            name: data.professor,
          },
        );
      }
    }

    // 2. Check/Create Course
    if (data.department && data.course_number) {
      const courses = await this.db.listDocuments(DB_ID, COLLECTIONS.COURSES, [
        Query.equal("department", data.department),
        Query.equal("course_number", data.course_number),
      ]);
      if (courses.total === 0) {
        await this.db.createDocument(DB_ID, COLLECTIONS.COURSES, "unique()", {
          department: data.department,
          course_number: data.course_number,
          course_name: data.course_name || "Unknown Course",
        });
      }
    }
  }
}
