/**
 * Shared rules for housing proof photos (duty/bounty proof and ad-hoc requests).
 * Browser-safe: no Node imports, so both the card UI and server actions can use it.
 */

/** Client-side size cap for a proof photo. Uploads go straight to S3, so this is a UX limit, not a platform one. */
export const PROOF_MAX_BYTES = 10 * 1024 * 1024;

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
};

const RASTER_IMAGE_TYPE = /^image\/[a-z0-9.+-]+$/;

/**
 * Picks the Content-Type to sign a proof upload with.
 * Some phones report an empty `File.type` for HEIC photos, so fall back to the extension.
 * SVG is refused because proofs are served back from our own origin by `/api/images`.
 *
 * @throws Error when the file is not a raster image.
 */
export function resolveProofContentType(
  filename: string,
  browserType: string,
): string {
  const type = browserType.trim().toLowerCase();
  if (type) {
    if (RASTER_IMAGE_TYPE.test(type) && type !== "image/svg+xml") {
      return type;
    }
    throw new Error("Proof must be a photo (JPEG, PNG, HEIC, or WebP).");
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const fromExt = EXTENSION_CONTENT_TYPES[ext];
  if (fromExt) return fromExt;
  throw new Error("Proof must be a photo (JPEG, PNG, HEIC, or WebP).");
}

/** Key prefix for proofs attached to an existing task. */
export function taskProofKeyPrefix(taskId: string): string {
  return `proofs/tasks/${taskId}/`;
}

/** Key prefix for ad-hoc request proofs, scoped to the requesting member. */
export function adHocProofKeyPrefix(discordId: string): string {
  return `proofs/adhoc/${discordId}/`;
}

/**
 * True when `key` was issued for this prefix (one object below it, no traversal).
 * Stops a client from pointing a submission at someone else's object.
 */
export function isProofKeyUnder(key: string, prefix: string): boolean {
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  return /^[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/i.test(rest) && !rest.includes("..");
}
