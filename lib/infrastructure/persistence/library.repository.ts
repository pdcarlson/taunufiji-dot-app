import { Query, Models } from "node-appwrite";
import { getDatabase } from "./client";
import { DB_ID, COLLECTIONS } from "@/lib/infrastructure/config/schema";
import {
  ILibraryRepository,
  LibrarySearchFilters,
  CreateResourceParams,
  LibraryMetadata,
} from "@/lib/domain/ports/library.repository";
import {
  LibraryResource,
  LibraryResourceSchema,
} from "@/lib/domain/types/library";

interface Course extends Models.Document {
  department: string;
  course_number: string;
  course_name: string;
  abbreviation: string;
}

interface Professor extends Models.Document {
  name: string;
}

const METADATA_PAGE_SIZE = 100;

export class AppwriteLibraryRepository implements ILibraryRepository {
  private get db() {
    return getDatabase();
  }

  private normalizeWhitespace(value: string): string {
    return value.trim().replace(/\s+/g, " ");
  }

  private normalizeDepartment(value: string): string {
    return this.normalizeWhitespace(value).toUpperCase();
  }

  private normalizeCourseNumber(value: string): string {
    return this.normalizeWhitespace(value).toUpperCase();
  }

  private normalizeProfessorName(value: string): string {
    return this.normalizeWhitespace(value);
  }

  private normalizeCourseName(value: string): string {
    return this.normalizeWhitespace(value);
  }

  private async listAllDocuments(
    collectionId: string,
  ): Promise<Models.Document[]> {
    const documents: Models.Document[] = [];
    let offset = 0;
    let total = 0;

    do {
      const response = await this.db.listDocuments(DB_ID, collectionId, [
        Query.limit(METADATA_PAGE_SIZE),
        Query.offset(offset),
      ]);
      documents.push(...response.documents);
      total = response.total;
      if (response.documents.length === 0) {
        break;
      }
      offset += response.documents.length;
    } while (offset < total);

    return documents;
  }

  private async hasNormalizedProfessorMatch(
    normalizedProfessor: string,
  ): Promise<boolean> {
    let offset = 0;
    let total = 0;

    do {
      const response = await this.db.listDocuments(
        DB_ID,
        COLLECTIONS.PROFESSORS,
        [Query.limit(METADATA_PAGE_SIZE), Query.offset(offset)],
      );

      const matchFound = response.documents.some((doc) => {
        const professorName =
          typeof (doc as Record<string, unknown>).name === "string"
            ? String((doc as Record<string, unknown>).name)
            : "";
        return (
          this.normalizeProfessorName(professorName).toLowerCase() ===
          normalizedProfessor.toLowerCase()
        );
      });

      if (matchFound) {
        return true;
      }

      total = response.total;
      if (response.documents.length === 0) {
        break;
      }
      offset += response.documents.length;
    } while (offset < total);

    return false;
  }

  async findById(id: string): Promise<LibraryResource | null> {
    try {
      const doc = await this.db.getDocument(DB_ID, COLLECTIONS.LIBRARY, id);
      return this.toDomain(doc);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "type" in error
      ) {
        const typedError = error as { code?: number; type?: string };
        if (
          typedError.code === 404 &&
          typedError.type === "document_not_found"
        ) {
          return null;
        }
      }
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
    if (filters.professor && filters.professor !== "All") {
      queries.push(Query.search("professor", filters.professor));
    }
    if (filters.year) {
      queries.push(Query.equal("year", filters.year));
    }
    if (filters.semester && filters.semester !== "All") {
      queries.push(Query.equal("semester", filters.semester));
    }
    if (filters.type && filters.type !== "All") {
      queries.push(Query.equal("type", filters.type));
    }
    if (filters.version && filters.version !== "All") {
      queries.push(Query.equal("version", filters.version));
    }

    const res = await this.db.listDocuments(
      DB_ID,
      COLLECTIONS.LIBRARY,
      queries,
    );
    return {
      documents: res.documents.map((doc) => this.toDomain(doc)),
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
    return this.toDomain(doc);
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
    const [courseDocuments, professorDocuments] = await Promise.all([
      this.listAllDocuments(COLLECTIONS.COURSES),
      this.listAllDocuments(COLLECTIONS.PROFESSORS),
    ]);

    // Group courses by Dept
    const courses: Record<string, { number: string; name: string }[]> = {};
    const seenCourses = new Set<string>();

    courseDocuments.forEach((doc: Models.Document) => {
      const c = doc as Course;
      const dept = this.normalizeDepartment(c.department ?? "");
      const number = this.normalizeCourseNumber(c.course_number ?? "");
      const name = this.normalizeCourseName(c.course_name ?? "");

      if (!dept || !number) {
        return;
      }

      const dedupeKey = `${dept}:${number}`;
      if (seenCourses.has(dedupeKey)) {
        return;
      }

      seenCourses.add(dedupeKey);
      if (!courses[dept]) courses[dept] = [];
      courses[dept].push({
        number: number,
        name: name || "Unknown Course",
      });
    });

    // Extract Professor Names
    const professorMap = new Map<string, string>();
    professorDocuments.forEach((doc: Models.Document) => {
      const rawName = (doc as Professor).name ?? "";
      const normalizedName = this.normalizeProfessorName(rawName);
      if (!normalizedName) {
        return;
      }

      const dedupeKey = normalizedName.toLowerCase();
      if (!professorMap.has(dedupeKey)) {
        professorMap.set(dedupeKey, normalizedName);
      }
    });

    for (const dept of Object.keys(courses)) {
      courses[dept].sort((a, b) => a.number.localeCompare(b.number));
    }

    const professors = Array.from(professorMap.values()).sort((a, b) =>
      a.localeCompare(b),
    );

    return { courses, professors };
  }

  async ensureMetadata(data: {
    department: string;
    course_number: string;
    course_name: string;
    professor: string;
  }): Promise<void> {
    const normalizedDepartment = this.normalizeDepartment(
      data.department ?? "",
    );
    const normalizedCourseNumber = this.normalizeCourseNumber(
      data.course_number ?? "",
    );
    const normalizedCourseName =
      this.normalizeCourseName(data.course_name ?? "") || "Unknown Course";
    const normalizedProfessor = this.normalizeProfessorName(
      data.professor ?? "",
    );

    // 1. Check/Create Professor
    if (normalizedProfessor) {
      const existingProfessor =
        await this.hasNormalizedProfessorMatch(normalizedProfessor);

      if (!existingProfessor) {
        await this.db.createDocument(
          DB_ID,
          COLLECTIONS.PROFESSORS,
          "unique()",
          {
            name: normalizedProfessor,
          },
        );
      }
    }

    // 2. Check/Create Course
    if (normalizedDepartment && normalizedCourseNumber) {
      const courses = await this.db.listDocuments(DB_ID, COLLECTIONS.COURSES, [
        Query.equal("department", normalizedDepartment),
        Query.equal("course_number", normalizedCourseNumber),
        Query.limit(1),
      ]);
      if (courses.total === 0) {
        await this.db.createDocument(DB_ID, COLLECTIONS.COURSES, "unique()", {
          department: normalizedDepartment,
          course_number: normalizedCourseNumber,
          course_name: normalizedCourseName,
        });
      }
    }
  }

  private toDomain(doc: Models.Document): LibraryResource {
    const domainResource = {
      ...doc,
      id: doc.$id,
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
    };
    return LibraryResourceSchema.parse(domainResource);
  }
}
