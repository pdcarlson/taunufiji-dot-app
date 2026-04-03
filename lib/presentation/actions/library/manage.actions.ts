"use server";

import { randomUUID } from "node:crypto";

import { logger } from "@/lib/utils/logger";
import { validatedLibraryUploadContentType } from "@/lib/utils/library-upload-content-type";
import { sanitizeLibraryUploadFilename } from "@/lib/utils/sanitize-library-upload-filename";
import { actionWrapper } from "@/lib/presentation/utils/action-handler";

export type PresignLibraryUploadInput = {
  filename: string;
};

export type PresignLibraryUploadResult = {
  /** Staging object key under `library/uploads/<uuid>/…`; pass to finalize as `fileId`. */
  key: string;
  uploadUrl: string;
  /** Basename after sanitization; use for UI label (finalize copies to `library/<this>`). */
  sanitizedFilename: string;
};

/**
 * Issues a presigned PUT URL to a **staging** key (`library/uploads/<uuid>/…`).
 * Finalize via `createLibraryResourceAction`, which promotes to `library/<sanitized>`.
 * Avoids sending the file through Vercel (serverless body limits ~4.5MB on Hobby).
 * S3 Content-Type is always `application/pdf` via `validatedLibraryUploadContentType()`.
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
      const stagingKey = `library/uploads/${randomUUID()}/${safeName}`;
      const validatedContentType = validatedLibraryUploadContentType();

      const uploadUrl = await container.storageService.getUploadUrl(
        stagingKey,
        validatedContentType,
      );

      return {
        key: stagingKey,
        uploadUrl,
        sanitizedFilename: safeName,
      };
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
      const profile = await container.userService.getByAuthId(userId);
      if (!profile) throw new Error("Profile not found");

      const year =
        typeof data.metadata.year === "string"
          ? parseInt(data.metadata.year)
          : data.metadata.year;

      return await container.libraryService.finalizeUploadedResource({
        tempS3Key: data.fileId,
        standardizedFilename: data.metadata.standardizedFilename,
        uploadedByDiscordId: profile.discord_id,
        department: data.metadata.department,
        course_number: data.metadata.courseNumber,
        course_name: data.metadata.courseName,
        professor: data.metadata.professor,
        semester: data.metadata.semester,
        year,
        type: data.metadata.assessmentType,
        version: data.metadata.version,
      });
    },
    { jwt, actionName: "createLibraryResource" },
  );

  if (result.success && result.data) return result.data;
  throw new Error(result.error || "Failed to create record");
}
