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

  if (filters.department) {
    const ws = normalizeWhitespace(filters.department);
    if (ws && ws.toUpperCase() !== "ALL") {
      out.department = ws.toUpperCase();
    }
  }
  if (filters.course_number) {
    const ws = normalizeWhitespace(filters.course_number);
    if (ws && ws.toUpperCase() !== "ALL") {
      out.course_number = ws.toUpperCase();
    }
  }
  if (filters.professor) {
    const v = normalizeWhitespace(filters.professor);
    if (v.toUpperCase() === "ALL") {
      // Canonical sentinel; repository skips Query.search for this value.
      out.professor = "All";
    } else if (v) {
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
  if (filters.semester) {
    const ws = normalizeWhitespace(filters.semester);
    if (ws && ws.toUpperCase() !== "ALL") {
      out.semester = ws;
    }
  }
  if (filters.type) {
    const ws = normalizeWhitespace(filters.type);
    if (ws && ws.toUpperCase() !== "ALL") {
      out.type = ws;
    }
  }
  if (filters.version) {
    const ws = normalizeWhitespace(filters.version);
    if (ws && ws.toUpperCase() !== "ALL") {
      out.version = ws;
    }
  }

  return out;
}
