import { presignProofUploadAction } from "@/lib/presentation/actions/housing/duty.actions";
import { PROOF_MAX_BYTES } from "@/lib/utils/proof-upload";
import { putWithRetry } from "@/lib/utils/put-with-retry";

/** Photos at or under this size upload as-is; re-encoding them gains little. */
const SHRINK_THRESHOLD_BYTES = 1.5 * 1024 * 1024;
/** Longest edge after shrinking; plenty for a reviewer to judge a chore. */
const SHRINK_MAX_EDGE = 2048;
const SHRINK_JPEG_QUALITY = 0.85;

export type ProofUploadStage = "preparing" | "uploading";

/**
 * Downscales a phone photo to a JPEG of at most 2048px on the long edge.
 * Members submit over cellular or house Wi-Fi, where an 8MB photo is slow and
 * fails more often; a ~500KB JPEG goes through in a second or two.
 * Returns the original file whenever the browser cannot decode it (e.g. HEIC
 * outside Safari) or shrinking would not make it smaller.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  if (file.size <= SHRINK_THRESHOLD_BYTES) return file;
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(
      1,
      SHRINK_MAX_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", SHRINK_JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]*$/, "") || "proof";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    bitmap.close?.();
  }
}

/**
 * Uploads a proof photo straight from the browser to S3 and returns its key.
 * Server actions only ever see the key, never the file bytes, which keeps
 * phone photos clear of Vercel's request body cap.
 *
 * @param file - Photo picked by the member.
 * @param jwt - Appwrite JWT; reuse it for the follow-up submit call.
 * @param taskId - Task the proof belongs to; omit for ad-hoc requests.
 * @param onStage - Progress hook for UI copy.
 * @returns The S3 key to pass to `submitProofAction` / `requestAdHocAction`.
 * @throws Error with a member-facing message on any failure.
 */
export async function uploadProofPhoto(
  file: File,
  jwt: string,
  taskId?: string,
  onStage?: (stage: ProofUploadStage) => void,
): Promise<string> {
  onStage?.("preparing");
  const photo = await shrinkPhoto(file);
  if (photo.size > PROOF_MAX_BYTES) {
    throw new Error("File size exceeds 10MB limit.");
  }

  const presign = await presignProofUploadAction(
    { filename: photo.name, contentType: photo.type, taskId },
    jwt,
  );
  if (!presign.success) throw new Error(presign.error);

  onStage?.("uploading");
  const { key, uploadUrl, contentType } = presign.data;
  let response: Response;
  try {
    response = await putWithRetry(uploadUrl, photo, contentType);
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
