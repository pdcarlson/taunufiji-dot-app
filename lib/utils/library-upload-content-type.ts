/**
 * Normalizes client-supplied Content-Type for presigned PUT signing.
 * Library uploads are PDF-only; always use application/pdf so the signature
 * matches the browser PUT header.
 */
export function validatedLibraryUploadContentType(): string {
  return "application/pdf";
}
