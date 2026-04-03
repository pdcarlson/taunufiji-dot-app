import { actionWrapper } from "@/lib/presentation/utils/action-handler";
import {
  presignLibraryUploadAction,
  createLibraryResourceAction,
} from "./manage.actions";

vi.mock("@/lib/presentation/utils/action-handler", () => ({
  actionWrapper: vi.fn(),
}));

describe("presignLibraryUploadAction", () => {
  const actionWrapperMock = vi.mocked(actionWrapper);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns upload URL and key on success", async () => {
    actionWrapperMock.mockResolvedValue({
      success: true,
      data: {
        key: "library/CSCI1200_Exam1.pdf",
        uploadUrl: "https://s3.example/presigned",
        sanitizedFilename: "CSCI1200_Exam1.pdf",
      },
    });

    const result = await presignLibraryUploadAction(
      { filename: "CSCI1200 Exam1.pdf", contentType: "application/pdf" },
      "jwt",
    );

    expect(result).toEqual({
      key: "library/CSCI1200_Exam1.pdf",
      uploadUrl: "https://s3.example/presigned",
      sanitizedFilename: "CSCI1200_Exam1.pdf",
    });
  });

  it("throws when actionWrapper fails", async () => {
    actionWrapperMock.mockResolvedValue({
      success: false,
      error: "Unauthorized",
      errorCode: "INSUFFICIENT_ROLE",
    });

    await expect(
      presignLibraryUploadAction(
        { filename: "a.pdf", contentType: "application/pdf" },
        "jwt",
      ),
    ).rejects.toThrow("Unauthorized");
  });
});

describe("createLibraryResourceAction", () => {
  const actionWrapperMock = vi.mocked(actionWrapper);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns record on success", async () => {
    actionWrapperMock.mockResolvedValue({
      success: true,
      data: { id: "rec1" },
    });

    const result = await createLibraryResourceAction(
      {
        fileId: "library/x.pdf",
        metadata: {
          department: "CSCI",
          courseNumber: "1200",
          courseName: "Intro",
          professor: "P",
          semester: "Spring",
          year: 2025,
          assessmentType: "Exam1",
          version: "Student",
          standardizedFilename: "x.pdf",
        },
      },
      "jwt",
    );

    expect(result).toEqual({ id: "rec1" });
  });

  it("throws when actionWrapper fails", async () => {
    actionWrapperMock.mockResolvedValue({
      success: false,
      error: "some error",
      errorCode: "UNKNOWN_ERROR",
    });

    await expect(
      createLibraryResourceAction(
        {
          fileId: "library/x.pdf",
          metadata: {
            department: "CSCI",
            courseNumber: "1200",
            courseName: "Intro",
            professor: "P",
            semester: "Spring",
            year: 2025,
            assessmentType: "Exam1",
            version: "Student",
            standardizedFilename: "x.pdf",
          },
        },
        "jwt",
      ),
    ).rejects.toThrow("some error");
  });
});
