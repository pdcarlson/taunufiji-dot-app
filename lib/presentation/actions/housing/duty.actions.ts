"use server";

import { randomUUID } from "node:crypto";

import { actionWrapper } from "@/lib/presentation/utils/action-handler";
import {
  adHocProofKeyPrefix,
  isProofKeyUnder,
  resolveProofContentType,
  taskProofKeyPrefix,
} from "@/lib/utils/proof-upload";
import { sanitizeLibraryUploadFilename } from "@/lib/utils/sanitize-library-upload-filename";

export async function claimTaskAction(
  taskId: string,
  _unsafeUserId: string,
  jwt: string,
) {
  return await actionWrapper(
    async ({ container, userId }) => {
      // 3. Resolve Profile
      const profile = await container.authService.getProfile(userId);
      if (!profile) throw new Error("Profile not found");

      // 4. Exec
      return await container.dutyService.claimTask(taskId, profile.discord_id);
    },
    { jwt },
  );
}

export async function unclaimTaskAction(taskId: string, jwt: string) {
  return await actionWrapper(
    async ({ container, userId }) => {
      const profile = await container.authService.getProfile(userId);
      if (!profile) throw new Error("Profile not found");

      return await container.dutyService.unclaimTask(
        taskId,
        profile.discord_id,
      );
    },
    { jwt },
  );
}

export type PresignProofUploadInput = {
  filename: string;
  contentType: string;
  /** Set for task proofs; omit for ad-hoc requests. */
  taskId?: string;
};

export type PresignProofUploadResult = {
  key: string;
  uploadUrl: string;
  /** Content-Type the URL was signed with; the browser PUT must send exactly this. */
  contentType: string;
};

/**
 * Issues a presigned S3 PUT URL for a proof photo.
 * The browser uploads straight to S3 so photos never pass through a Vercel
 * function body (hard cap ~4.5MB, below a typical phone photo).
 */
export async function presignProofUploadAction(
  input: PresignProofUploadInput,
  jwt: string,
) {
  return await actionWrapper(
    async ({ container, userId }): Promise<PresignProofUploadResult> => {
      if (!input.filename?.trim()) throw new Error("Missing file name");
      const contentType = resolveProofContentType(
        input.filename,
        input.contentType ?? "",
      );

      const profile = await container.authService.getProfile(userId);
      if (!profile) throw new Error("Profile not found");

      let prefix: string;
      if (input.taskId) {
        await container.dutyService.assertCanSubmitProof(
          input.taskId,
          profile.discord_id,
        );
        prefix = taskProofKeyPrefix(input.taskId);
      } else {
        prefix = adHocProofKeyPrefix(profile.discord_id);
      }

      // A fresh UUID per upload: iOS names every picked photo "image.jpg", and
      // /api/images caches by key, so reusing keys showed reviewers stale proof.
      const key = `${prefix}${randomUUID()}/${sanitizeLibraryUploadFilename(input.filename)}`;
      const uploadUrl = await container.storageService.getUploadUrl(
        key,
        contentType,
      );
      return { key, uploadUrl, contentType };
    },
    { jwt, actionName: "housing.presignProofUpload" },
  );
}

/**
 * Attaches an already-uploaded proof (see {@link presignProofUploadAction}) to a task.
 */
export async function submitProofAction(
  input: { taskId: string; proofKey: string },
  jwt: string,
) {
  return await actionWrapper(
    async ({ container, userId }) => {
      const { taskId, proofKey } = input;
      if (!taskId || !proofKey) throw new Error("Missing data");
      if (!isProofKeyUnder(proofKey, taskProofKeyPrefix(taskId))) {
        throw new Error("Invalid proof upload. Please upload the photo again.");
      }

      const profile = await container.authService.getProfile(userId);
      if (!profile) throw new Error("Profile not found");

      return await container.dutyService.submitProof(
        taskId,
        profile.discord_id,
        proofKey,
      );
    },
    { jwt, actionName: "housing.submitProof" },
  );
}

export type AdHocRequestInput = {
  title: string;
  description: string;
  points: number;
  proofKey: string;
};

/**
 * Creates an ad-hoc points request from an already-uploaded proof photo.
 */
export async function requestAdHocAction(input: AdHocRequestInput, jwt: string) {
  return await actionWrapper(
    async ({ container, userId }) => {
      const title = input.title?.trim();
      const description = input.description?.trim();
      const { points, proofKey } = input;

      if (!title || !description || !proofKey) {
        throw new Error("Missing required fields");
      }

      if (!Number.isInteger(points) || points <= 0 || points > 100) {
        throw new Error("Points must be between 1 and 100");
      }

      const profile = await container.authService.getProfile(userId);
      if (!profile) throw new Error("Profile not found");

      if (!isProofKeyUnder(proofKey, adHocProofKeyPrefix(profile.discord_id))) {
        throw new Error("Invalid proof upload. Please upload the photo again.");
      }

      return await container.dutyService.requestAdHocPoints(
        profile.discord_id,
        {
          title,
          description,
          points,
          proofKey,
        },
      );
    },
    { jwt, actionName: "housing.requestAdHoc" },
  );
}
