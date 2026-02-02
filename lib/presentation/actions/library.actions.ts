"use server";

import { StorageService } from "@/lib/infrastructure/storage/storage";
import { logger } from "@/lib/utils/logger";
import { actionWrapper } from "@/lib/presentation/utils/action-handler";

/**
 * Uploads a file to S3 and returns the Key/ID
 */
export async function uploadFileAction(formData: FormData) {
  try {
    const jwt = formData.get("jwt") as string;

    // We treat upload as an action requiring at least Brother status
    // Note: wrapper usually takes jwt in options.
    // But wrapper also gets session/jwt inside.
    const result = await actionWrapper(
      async ({ container }) => {
        // 2. Process File
        const file = formData.get("file") as File;
        if (!file) throw new Error("No file uploaded");

        const buffer = Buffer.from(await file.arrayBuffer());
        // Use 'library/' folder and keep original filename (sanitized)
        const key = `library/${file.name.replace(/\s+/g, "_")}`;

        await StorageService.uploadFile(buffer, key, file.type);

        // Return an ID-like object to satisfy UI
        return { $id: key, key: key };
      },
      { jwt },
    );

    if (result.success && result.data) return result.data;
    throw new Error(result.error || "Upload failed");
  } catch (e) {
    logger.error("Upload Failed", e);
    throw new Error("Failed to upload file");
  }
}

/**
 * Creates the metadata record in DB
 */
interface CreateResourceDTO {
  fileId: string;
  metadata: {
    department: string;
    courseNumber: string;
    courseName: string;
    professor: string;
    semester: string;
    year: string | number;
    assessmentType: string;
    version: string;
    standardizedFilename: string;
  };
}

export async function createLibraryResourceAction(
  data: CreateResourceDTO,
  jwt: string,
) {
  const result = await actionWrapper(
    async ({ container, userId }) => {
      // 3. Ensure User Profile (Discord ID)
      const profile = await container.userService.getByAuthId(userId);
      if (!profile) throw new Error("Profile not found");

      // 4. Ensure Dependents (Course/Professor) exist
      await container.libraryService.ensureMetadata({
        department: data.metadata.department,
        course_number: data.metadata.courseNumber,
        course_name: data.metadata.courseName,
        professor: data.metadata.professor,
      });

      // 2. Create Record
      const record = await container.libraryService.createResource({
        department: data.metadata.department,
        course_number: data.metadata.courseNumber,
        course_name: data.metadata.courseName,
        professor: data.metadata.professor,
        semester: data.metadata.semester,
        year:
          typeof data.metadata.year === "string"
            ? parseInt(data.metadata.year)
            : data.metadata.year,
        type: data.metadata.assessmentType,
        version: data.metadata.version,
        original_filename: data.metadata.standardizedFilename,
        file_s3_key: data.fileId,
        uploaded_by: profile.discord_id,
      });

      // 3. Dispatch Event (Event Architecture)
      try {
        const { DomainEventBus } =
          await import("@/lib/infrastructure/events/dispatcher");
        const { LibraryEvents } = await import("@/lib/domain/events");
        await DomainEventBus.publish(LibraryEvents.LIBRARY_UPLOADED, {
          userId: profile.discord_id,
          resourceId: record.id,
          fileName: data.metadata.standardizedFilename,
        });
      } catch (e) {
        logger.error("Failed to dispatch LIBRARY_UPLOADED event", e);
      }

      return record;
    },
    { jwt },
  );

  if (result.success && result.data) return result.data;
  throw new Error(result.error || "Failed to create record");
}

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
  jwt: string,
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
