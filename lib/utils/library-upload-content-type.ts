/** Library upload flow only supports PDF objects in S3. */
const ALLOWED_LIBRARY_UPLOAD_CONTENT_TYPES = new Set(["application/pdf"]);

/**
 * Normalizes client-supplied Content-Type for presigned PUT signing.
 * Unknown or empty values fall back to PDF so signatures match the upload page.
 */
export function validatedLibraryUploadContentType(
  raw: string | undefined,
): string {
  const t = (raw ?? "").trim().toLowerCase();
  if (ALLOWED_LIBRARY_UPLOAD_CONTENT_TYPES.has(t)) {
    return "application/pdf";
  }
  return "application/pdf";
}
