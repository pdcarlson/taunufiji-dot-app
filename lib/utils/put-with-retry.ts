/**
 * PUTs a file to a presigned S3 URL, retrying transient (5xx / network) failures.
 * Browser-safe: used by Library and Housing proof uploads, which go straight to S3
 * so the file never passes through a Vercel function body.
 *
 * @param url - Presigned PUT URL.
 * @param body - File or Blob to upload.
 * @param contentType - Must match the Content-Type the URL was signed with.
 * @param maxRetries - Extra attempts after the first.
 * @returns The final response (ok or the last non-retryable failure).
 */
export async function putWithRetry(
  url: string,
  body: Blob,
  contentType: string,
  maxRetries = 2,
): Promise<Response> {
  let lastResponse: Response | null = null;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "PUT",
        body,
        headers: { "Content-Type": contentType },
      });
      if (response.ok) {
        return response;
      }
      lastResponse = response;
      const retryable = response.status >= 500 && response.status <= 599;
      if (!retryable || attempt === maxRetries) {
        return response;
      }
    } catch (e) {
      lastError = e;
      if (attempt === maxRetries) {
        throw e;
      }
    }
    const delayMs = 300 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, delayMs));
  }

  if (lastResponse) {
    return lastResponse;
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Storage upload failed after retries");
}
