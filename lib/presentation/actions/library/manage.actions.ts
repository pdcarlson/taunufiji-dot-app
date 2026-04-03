"use server";

import { logger } from "@/lib/utils/logger";
import { sanitizeLibraryUploadFilename } from "@/lib/utils/sanitize-library-upload-filename";
import { actionWrapper } from "@/lib/presentation/utils/action-handler";

export type PresignLibraryUploadInput = {
  filename: string;
  contentType: string;
};

export type PresignLibraryUploadResult = {
  key: string;
  uploadUrl: string;
  /** Basename under `library/` after server-side sanitization (use for DB + display). */
  sanitizedFilename: string;
};

/**
 * Issues a presigned PUT URL so the browser uploads directly to S3.
 * Avoids sending the file through Vercel (serverless body limits ~4.5MB on Hobby).
 */
export async function presignLibraryUploadAction(
  input: PresignLibraryUploadInput,
  jwt: string,
): Promise<PresignLibraryUploadResult> {
  const result = await actionWrapper(
    async ({ container }) => {
      if (!input.filename?.trim()) {
        throw new Error("No filename provided");
      }
      const safeName = sanitizeLibraryUploadFilename(input.filename);
      const key = `library/${safeName}`;

      const uploadUrl = await container.storageService.getUploadUrl(
        key,
        input.contentType || "application/pdf",
      );

      return { key, uploadUrl, sanitizedFilename: safeName };
    },
    { jwt, actionName: "presignLibraryUpload" },
  );

  if (result.success && result.data) return result.data;
  logger.error("Library upload presign failed", result.error);
  throw new Error(result.error || "Upload presign failed");
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
  jwt?: string,
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
