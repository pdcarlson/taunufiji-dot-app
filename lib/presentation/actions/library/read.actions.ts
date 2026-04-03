"use server";

import { actionWrapper } from "@/lib/presentation/utils/action-handler";
import type { LibrarySearchFilters } from "@/lib/domain/ports/library.repository";
import type { LibraryResource } from "@/lib/domain/types/library";

interface MetadataActionOptions {
  throwOnError?: boolean;
}

export async function getMetadataAction(
  jwt?: string,
  options: MetadataActionOptions = {},
) {
  const result = await actionWrapper(
    async ({ container }) => {
      return await container.libraryService.getSearchMetadata();
    },
    { jwt, actionName: "library-get-metadata" },
  );

  if (result.success && result.data) return result.data;
  if (options.throwOnError) {
    throw new Error(result.error || "Failed to load metadata");
  }
  return { courses: {}, professors: [] };
}

export async function checkDuplicateResourceAction(
  data: {
    department: string;
    courseNumber: string;
    assessmentType: string;
    semester: string;
    year: string | number;
    version: string;
  },
  jwt?: string,
) {
  const result = await actionWrapper(
    async ({ container }) => {
      const year =
        typeof data.year === "string" ? parseInt(data.year) : data.year;

      return await container.libraryService.checkDuplicate({
        department: data.department,
        course_number: data.courseNumber,
        type: data.assessmentType,
        semester: data.semester,
        year: year,
        version: data.version,
      });
    },
    { jwt },
  );

  if (result.success) return result.data ?? false;
  return false;
}

/**
 * Searches the library primarily for client-side filtering interactions
 */
interface LibrarySearchRequestFilters {
  department?: string;
  course_number?: string;
  professor?: string;
  year?: string | number;
  semester?: string;
  assessment_type?: string;
  type?: string;
  version?: string;
}

export interface LibrarySearchResult {
  documents: LibraryResource[];
  total: number;
}

export async function searchLibraryAction(
  filters: LibrarySearchRequestFilters,
  jwt?: string,
): Promise<LibrarySearchResult> {
  const result = await actionWrapper(
    async ({ container }) => {
      // Sanitize filters
      const searchFilters: LibrarySearchFilters = {};

      if (filters.department && filters.department !== "All")
        searchFilters.department = filters.department;
      if (filters.course_number && filters.course_number !== "All")
        searchFilters.course_number = filters.course_number;
      if (filters.professor) searchFilters.professor = filters.professor;
      if (filters.year !== undefined && filters.year !== "") {
        const yearCandidate =
          typeof filters.year === "string"
            ? parseInt(filters.year, 10)
            : Number(filters.year);
        if (
          Number.isInteger(yearCandidate) &&
          isFinite(yearCandidate) &&
          yearCandidate > 0
        ) {
          searchFilters.year = yearCandidate;
        }
      }
      if (filters.semester && filters.semester !== "All") {
        searchFilters.semester = filters.semester;
      }
      const normalizedType =
        filters.type && filters.type !== "All" ? filters.type : undefined;
      const normalizedAssessmentType =
        filters.assessment_type && filters.assessment_type !== "All"
          ? filters.assessment_type
          : undefined;

      if (
        normalizedType &&
        normalizedAssessmentType &&
        normalizedType !== normalizedAssessmentType
      ) {
        throw new Error(
          "Invalid filters: type and assessment_type must match when both are provided.",
        );
      }

      const resolvedType = normalizedType ?? normalizedAssessmentType;
      if (resolvedType) {
        searchFilters.type = resolvedType;
      }
      if (filters.version && filters.version !== "All") {
        searchFilters.version = filters.version;
      }

      return await container.libraryService.search(searchFilters);
    },
    { jwt, public: true, actionName: "library-search" },
  );

  if (result.success && result.data) return result.data;
  throw new Error(result.error || "Search failed");
}

/**
 * Generates a secure S3 download link
 */
export async function getDownloadLinkAction(id: string, jwt: string) {
  const result = await actionWrapper(
    async ({ container }) => {
      return await container.libraryService.getDownloadLink(id);
    },
    { jwt },
  );

  if (result.success && result.data) return result.data;
  throw new Error(result.error || "Failed to generate download link");
}

export async function getLibraryStatsAction(jwt: string) {
  const result = await actionWrapper(
    async ({ container, userId }) => {
      const profile = await container.userService.getByAuthId(userId);
      return await container.libraryService.getStats(profile?.discord_id);
    },
    { jwt },
  );

  if (result.success && result.data) return result.data;
  return { totalFiles: 0, userFiles: 0 };
}
