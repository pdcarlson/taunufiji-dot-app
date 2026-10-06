import { presignProofUploadAction } from "@/lib/presentation/actions/housing/duty.actions";
import { PROOF_MAX_BYTES } from "@/lib/utils/proof-upload";
import { putWithRetry } from "@/lib/utils/put-with-retry";

/**
 * Uploads a proof photo straight from the browser to S3 and returns its key.
 * Server actions only ever see the key, never the file bytes, which keeps
 * phone photos clear of Vercel's request body cap.
 *
 * @param file - Photo picked by the member.
 * @param jwt - Appwrite JWT; reuse it for the follow-up submit call.
 * @param taskId - Task the proof belongs to; omit for ad-hoc requests.
 * @returns The S3 key to pass to `submitProofAction` / `requestAdHocAction`.
 * @throws Error with a member-facing message on any failure.
 */
export async function uploadProofPhoto(
  file: File,
  jwt: string,
  taskId?: string,
): Promise<string> {
  if (file.size > PROOF_MAX_BYTES) {
    throw new Error("File size exceeds 10MB limit.");
  }

  const presign = await presignProofUploadAction(
    { filename: file.name, contentType: file.type, taskId },
    jwt,
  );
  if (!presign.success) throw new Error(presign.error);

  const { key, uploadUrl, contentType } = presign.data;
  let response: Response;
  try {
    response = await putWithRetry(uploadUrl, file, contentType);
  } catch {
    throw new Error(
      "Photo upload failed. Check your connection and try again.",
    );
  }
  if (!response.ok) {
    throw new Error(
      `Photo upload failed (${response.status}). Please try again.`,
    );
  }
  return key;
}
