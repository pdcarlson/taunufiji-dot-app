"use server";

import { actionWrapper } from "@/lib/presentation/utils/action-handler";

export async function getMetadataAction(jwt?: string) {
  const result = await actionWrapper(
    async ({ container }) => {
      return await container.libraryService.getSearchMetadata();
    },
    { jwt },
  );

  if (result.success && result.data) return result.data;
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
export async function searchLibraryAction(filters: any, jwt?: string) {
  const result = await actionWrapper(
    async ({ container }) => {
      // Sanitize filters
      const searchFilters: any = {};

      if (filters.department && filters.department !== "All")
        searchFilters.department = filters.department;
      if (filters.course_number && filters.course_number !== "All")
        searchFilters.course_number = filters.course_number;
      if (filters.professor) searchFilters.professor = filters.professor;
      if (filters.year)
        searchFilters.year =
          typeof filters.year === "string"
            ? parseInt(filters.year)
            : filters.year;

      return await container.libraryService.search(searchFilters);
    },
    { jwt, public: true },
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
