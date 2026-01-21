"use server";

import { LibraryService } from "@/lib/services/library.service";
import { PointsService } from "@/lib/services/points.service";
import { StorageService } from "@/lib/services/s3.service";
import { AuthService } from "@/lib/services/auth.service";
import { logger } from "@/lib/logger";
import { ID, Client, Account } from "node-appwrite";
import { env } from "@/lib/config/env";

/**
 * Uploads a file to S3 and returns the Key/ID
 */
// server-only import to avoid client bundle issues
import { createJWTClient, createSessionClient } from "@/lib/server/appwrite";

export async function uploadFileAction(formData: FormData) {
  try {
    // 1. Security Check (JWT)
    const jwt = formData.get("jwt") as string;
    if (!jwt) throw new Error("No auth token provided");

    const { account } = createJWTClient(jwt);
    const user = await account.get();
    if (!user) throw new Error("Unauthorized");

    const isAuthorized = await AuthService.verifyBrother(user.$id);
    if (!isAuthorized) throw new Error("Forbidden");

    // 2. Process File
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file uploaded");

    const buffer = Buffer.from(await file.arrayBuffer());
    // Use 'library/' folder and keep original filename (sanitized)
    const key = `library/${file.name.replace(/\s+/g, "_")}`;

    await StorageService.uploadFile(buffer, key, file.type);

    // Return an ID-like object to satisfy UI
    return { $id: key, key: key };
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

/**
 * Creates the metadata record in DB
 */
export async function createLibraryResourceAction(
  data: CreateResourceDTO,
  jwt: string,
) {
  try {
    // 1. Verify Authentication via JWT
    const client = new Client()
      .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setJWT(jwt);
    const account = new Account(client);
    const user = await account.get();

    if (!user) throw new Error("Invalid Session");

    // 2. Authorization Check (Discord Roles)
    // We use the authenticated user's ID to check roles in our DB/Discord
    const isAuthorized = await AuthService.verifyBrother(user.$id);
    if (!isAuthorized) throw new Error("Unauthorized Access");

    // 3. Ensure User Profile (Discord ID)
    const UserService = (await import("@/lib/services/user.service"))
      .UserService;
    // We get auth user ID -> Sync calls syncUser -> creates/updates doc.
    // AuthService.getProfile uses "auth_id" attribute. UserService has getByAuthId.
    // Let's use UserService.getByAuthId(auth_id) to be consistent.
    const profile = await UserService.getByAuthId(user.$id);
    if (!profile) throw new Error("Profile not found");

    // 4. Ensure Dependents (Course/Professor) exist
    await LibraryService.ensureMetadata({
      department: data.metadata.department,
      course_number: data.metadata.courseNumber,
      course_name: data.metadata.courseName,
      professor: data.metadata.professor,
    });

    // 2. Create Record
    const result = await LibraryService.createResource({
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
      file_s3_key: data.fileId, // This is the Key from uploadFileAction
      uploaded_by: profile.discord_id, // FIX: Use Discord ID (Stable Attribute)
    });

    // 3. Award Points
    try {
      await PointsService.awardPoints(profile.discord_id, {
        amount: 10,
        reason: "Uploaded Exam/Note",
        category: "event",
      });
    } catch (e) {
      logger.error("Failed to award upload points", e);
      // Do not fail the request if points fail, but log it.
    }

    return result;
  } catch (e) {
    logger.error("Create Resource Failed", e);
    throw new Error("Failed to create record");
  }
}

/**
 * Fetches Metadata for dropdowns
 */
export async function getMetadataAction(jwt?: string) {
  try {
    // Security Guard
    let user;

    if (jwt) {
      const { account } = createJWTClient(jwt);
      user = await account.get();
    } else {
      const { account } = await createSessionClient();
      user = await account.get();
    }

    if (!(await AuthService.verifyBrother(user.$id))) {
      return { courses: {}, professors: [] };
    }

    return await LibraryService.getSearchMetadata();
  } catch (e) {
    logger.error("Get Metadata Failed", e);
    return { courses: {}, professors: [] };
  }
}
