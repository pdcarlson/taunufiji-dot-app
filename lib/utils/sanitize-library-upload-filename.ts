import { randomUUID } from "node:crypto";

const MAX_OBJECT_BASENAME_LENGTH = 200;

/**
 * Produces a single path segment safe for S3 keys under `library/`.
 * Prevents path traversal, control characters, and unexpected encodings in client-supplied names.
 */
export function sanitizeLibraryUploadFilename(original: string): string {
  let s = original.normalize("NFKC");

  for (let i = 0; i < 8; i += 1) {
    try {
      const decoded = decodeURIComponent(s);
      if (decoded === s) break;
      s = decoded;
    } catch {
      break;
    }
  }

  s = s.replace(/\\/g, "/");
  s = s.replace(/\0/g, "");
  s = s.replace(/[\u0001-\u001F\u007F]/g, "");

  const segments = s.split("/").filter((seg) => seg.length > 0);
  const base = segments.length > 0 ? (segments.at(-1) ?? s) : s;

  let cleaned = "";
  for (const ch of base) {
    if (/^[a-zA-Z0-9._-]$/.test(ch)) {
      cleaned += ch;
    } else {
      cleaned += "_";
    }
  }

  cleaned = cleaned.replace(/\.\.+/g, "_");
  cleaned = cleaned.replace(/_+/g, "_");
  cleaned = cleaned.replace(/-+/g, "-");
  cleaned = cleaned.replace(/^[._-]+|[._-]+$/g, "");

  if (cleaned.length > MAX_OBJECT_BASENAME_LENGTH) {
    cleaned = cleaned.slice(0, MAX_OBJECT_BASENAME_LENGTH).replace(/[._-]+$/g, "");
  }

  if (!cleaned) {
    return `upload-${randomUUID()}.pdf`;
  }

  return cleaned;
}
