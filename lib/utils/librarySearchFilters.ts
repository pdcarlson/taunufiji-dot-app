import type { LibrarySearchFilters } from "@/lib/domain/ports/library.repository";

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Aligns filter values with how library metadata is stored (see upload flow and
 * {@link AppwriteLibraryRepository.ensureMetadata}) so Appwrite equality queries match documents.
 */
export function normalizeLibrarySearchFilters(
  filters: LibrarySearchFilters,
): LibrarySearchFilters {
  const out: LibrarySearchFilters = {};

  if (filters.department && filters.department !== "All") {
    const v = normalizeWhitespace(filters.department).toUpperCase();
    if (v) {
      out.department = v;
    }
  }
  if (filters.course_number && filters.course_number !== "All") {
    const v = normalizeWhitespace(filters.course_number).toUpperCase();
    if (v) {
      out.course_number = v;
    }
  }
  if (filters.professor && filters.professor !== "All") {
    const v = normalizeWhitespace(filters.professor);
    if (v) {
      out.professor = v;
    }
  }
  if (
    filters.year !== undefined &&
    Number.isInteger(filters.year) &&
    isFinite(filters.year) &&
    filters.year > 0
  ) {
    out.year = filters.year;
  }
  if (filters.semester && filters.semester !== "All") {
    const v = normalizeWhitespace(filters.semester);
    if (v) {
      out.semester = v;
    }
  }
  if (filters.type && filters.type !== "All") {
    const v = normalizeWhitespace(filters.type);
    if (v) {
      out.type = v;
    }
  }
  if (filters.version && filters.version !== "All") {
    const v = normalizeWhitespace(filters.version);
    if (v) {
      out.version = v;
    }
  }

  return out;
}
