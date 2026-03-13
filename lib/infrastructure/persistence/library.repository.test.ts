import { COLLECTIONS, DB_ID } from "@/lib/infrastructure/config/schema";
import { AppwriteLibraryRepository } from "./library.repository";
import { getDatabase } from "./client";

vi.mock("./client", () => ({
  getDatabase: vi.fn(),
}));

describe("AppwriteLibraryRepository.ensureMetadata", () => {
  const getDatabaseMock = vi.mocked(getDatabase);
  const mockDb = {
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getDatabaseMock.mockReturnValue(mockDb as never);
  });

  it("does not create duplicate professor when normalized match exists", async () => {
    mockDb.listDocuments
      .mockResolvedValueOnce({
        documents: [{ $id: "prof-1", name: "Other Name" }],
        total: 2,
      })
      .mockResolvedValueOnce({
        documents: [{ $id: "prof-2", name: "  Dr Smith  " }],
        total: 2,
      })
      .mockResolvedValueOnce({
        documents: [{ $id: "course-1" }],
        total: 1,
      });

    const repository = new AppwriteLibraryRepository();
    await repository.ensureMetadata({
      department: "csci",
      course_number: "1200",
      course_name: "Data Structures",
      professor: "dr smith",
    });

    expect(mockDb.createDocument).not.toHaveBeenCalled();
  });

  it("creates normalized professor and course when missing", async () => {
    mockDb.listDocuments
      .mockResolvedValueOnce({
        documents: [],
        total: 0,
      })
      .mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

    const repository = new AppwriteLibraryRepository();
    await repository.ensureMetadata({
      department: " csci ",
      course_number: " 1200 ",
      course_name: "  Data Structures  ",
      professor: "  Dr Smith  ",
    });

    expect(mockDb.createDocument).toHaveBeenNthCalledWith(
      1,
      DB_ID,
      COLLECTIONS.PROFESSORS,
      "unique()",
      { name: "Dr Smith" },
    );
    expect(mockDb.createDocument).toHaveBeenNthCalledWith(
      2,
      DB_ID,
      COLLECTIONS.COURSES,
      "unique()",
      {
        department: "CSCI",
        course_number: "1200",
        course_name: "Data Structures",
      },
    );
  });
});
