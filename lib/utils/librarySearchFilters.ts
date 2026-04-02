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
    out.department = normalizeWhitespace(filters.department).toUpperCase();
  }
  if (filters.course_number && filters.course_number !== "All") {
    out.course_number = normalizeWhitespace(filters.course_number).toUpperCase();
  }
  if (filters.professor) {
    out.professor = normalizeWhitespace(filters.professor);
  }
  if (filters.year !== undefined) {
    out.year = filters.year;
  }
  if (filters.semester && filters.semester !== "All") {
    out.semester = normalizeWhitespace(filters.semester);
  }
  if (filters.type && filters.type !== "All") {
    out.type = normalizeWhitespace(filters.type);
  }
  if (filters.version && filters.version !== "All") {
    out.version = normalizeWhitespace(filters.version);
  }

  return out;
}
