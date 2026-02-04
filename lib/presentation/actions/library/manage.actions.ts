"use server";

import { logger } from "@/lib/utils/logger";
import { actionWrapper } from "@/lib/presentation/utils/action-handler";

/**
 * Uploads a file to S3 and returns the Key/ID
 */
export async function uploadFileAction(formData: FormData) {
  try {
    const result = await actionWrapper(async ({ container }) => {
      // 2. Process File
      const file = formData.get("file") as File;
      if (!file) throw new Error("No file uploaded");

      const buffer = Buffer.from(await file.arrayBuffer());
      // Use 'library/' folder and keep original filename (sanitized)
      const key = `library/${file.name.replace(/\s+/g, "_")}`;

      await container.storageService.uploadFile(buffer, key, file.type);

      // Return an ID-like object to satisfy UI
      return { $id: key, key: key };
    });

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
