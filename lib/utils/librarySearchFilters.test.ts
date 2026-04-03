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

  it("drops All sentinel values for equality-style fields", () => {
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

  it("drops All sentinel after trim and case-insensitive match for equality-style fields", () => {
    expect(
      normalizeLibrarySearchFilters({
        department: "  all ",
        course_number: "\tAll\n",
        semester: " ALL ",
        type: "all",
        version: "  ALL  ",
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

  it("passes professor All through unchanged (search field, not equality sentinel)", () => {
    expect(normalizeLibrarySearchFilters({ professor: "All" })).toEqual({
      professor: "All",
    });
    expect(normalizeLibrarySearchFilters({ professor: "  all " })).toEqual({
      professor: "All",
    });
  });

  it("preserves positive integer year", () => {
    expect(normalizeLibrarySearchFilters({ year: 2025 })).toEqual({
      year: 2025,
    });
  });

  it("omits year when not a positive integer", () => {
    expect(
      normalizeLibrarySearchFilters({
        year: 0,
      }),
    ).toEqual({});
    expect(normalizeLibrarySearchFilters({ year: -1 })).toEqual({});
    expect(normalizeLibrarySearchFilters({ year: 1.5 })).toEqual({});
    expect(normalizeLibrarySearchFilters({ year: NaN })).toEqual({});
    expect(normalizeLibrarySearchFilters({ year: Infinity })).toEqual({});
  });

  it("omits string filter keys when value is empty", () => {
    expect(
      normalizeLibrarySearchFilters({
        department: "",
        course_number: "",
        professor: "",
        semester: "",
        type: "",
        version: "",
      }),
    ).toEqual({});
  });

  it("omits string filter keys when value is whitespace-only after trim", () => {
    expect(
      normalizeLibrarySearchFilters({
        department: "   ",
        course_number: "\t  ",
        professor: " \n ",
      }),
    ).toEqual({});
  });
});
