import { normalizeLibrarySearchFilters } from "./librarySearchFilters";

describe("normalizeLibrarySearchFilters", () => {
  it("uppercases department and course_number and trims whitespace", () => {
    expect(
      normalizeLibrarySearchFilters({
        department: "  csci ",
        course_number: " 1200 ",
      }),
    ).toEqual({
      department: "CSCI",
      course_number: "1200",
    });
  });

  it("drops All sentinel values", () => {
    expect(
      normalizeLibrarySearchFilters({
        department: "All",
        course_number: "All",
        semester: "All",
        type: "All",
        version: "All",
      }),
    ).toEqual({});
  });

  it("normalizes professor and other string filters", () => {
    expect(
      normalizeLibrarySearchFilters({
        professor: "  Dr.  Smith ",
        semester: "Fall",
        type: "Exam 1",
        version: "Student",
      }),
    ).toEqual({
      professor: "Dr. Smith",
      semester: "Fall",
      type: "Exam 1",
      version: "Student",
    });
  });

  it("preserves year", () => {
    expect(normalizeLibrarySearchFilters({ year: 2025 })).toEqual({
      year: 2025,
    });
  });
});
