import type { ActionContext } from "@/lib/presentation/utils/action-handler";
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
  let ctx: ActionContext;

  const makeContext = (): ActionContext => ({
    container: {
      storageService: {
        getUploadUrl: vi.fn().mockResolvedValue("https://s3.example/presigned"),
        getReadUrl: vi.fn(),
        uploadFile: vi.fn(),
        copyObject: vi.fn(),
        deleteObject: vi.fn(),
      },
    } as unknown as ActionContext["container"],
    userId: "user-1",
    account: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = makeContext();
    actionWrapperMock.mockImplementation(async (action) => {
      try {
        const data = await action(ctx);
        return { success: true, data };
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "An unexpected error occurred.";
        return {
          success: false,
          error: msg,
          errorCode: "UNKNOWN_ERROR" as const,
        };
      }
    });
  });

  it("presigns a staging key and returns sanitized basename", async () => {
    const result = await presignLibraryUploadAction(
      { filename: "CSCI1200 Exam1.pdf" },
      "jwt",
    );

    expect(result.sanitizedFilename).toBe("CSCI1200_Exam1.pdf");
    expect(result.key).toMatch(
      /^library\/uploads\/[0-9a-f-]{36}\/CSCI1200_Exam1\.pdf$/i,
    );
    expect(result.uploadUrl).toBe("https://s3.example/presigned");
    expect(ctx.container.storageService.getUploadUrl).toHaveBeenCalledWith(
      result.key,
      "application/pdf",
    );
  });

  it("throws when actionWrapper returns failure envelope", async () => {
    actionWrapperMock.mockResolvedValueOnce({
      success: false,
      error: "Unauthorized",
      errorCode: "INSUFFICIENT_ROLE",
    });

    await expect(
      presignLibraryUploadAction({ filename: "a.pdf" }, "jwt"),
    ).rejects.toThrow("Unauthorized");
  });
});

describe("createLibraryResourceAction", () => {
  const actionWrapperMock = vi.mocked(actionWrapper);
  let ctx: ActionContext;

  const makeContext = (): ActionContext => ({
    container: {
      userService: {
        getByAuthId: vi.fn().mockResolvedValue({ discord_id: "d1" }),
      },
      libraryService: {
        finalizeUploadedResource: vi
          .fn()
          .mockResolvedValue({ id: "rec1" }),
      },
    } as unknown as ActionContext["container"],
    userId: "auth-1",
    account: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = makeContext();
    actionWrapperMock.mockImplementation(async (action) => {
      try {
        const data = await action(ctx);
        return { success: true, data };
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "An unexpected error occurred.";
        return {
          success: false,
          error: msg,
          errorCode: "UNKNOWN_ERROR" as const,
        };
      }
    });
  });

  it("delegates to libraryService.finalizeUploadedResource", async () => {
    const result = await createLibraryResourceAction(
      {
        fileId: "library/uploads/uuid/x.pdf",
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
    expect(ctx.container.userService.getByAuthId).toHaveBeenCalledWith("auth-1");
    expect(
      ctx.container.libraryService.finalizeUploadedResource,
    ).toHaveBeenCalledWith({
      tempS3Key: "library/uploads/uuid/x.pdf",
      standardizedFilename: "x.pdf",
      uploadedByDiscordId: "d1",
      department: "CSCI",
      course_number: "1200",
      course_name: "Intro",
      professor: "P",
      semester: "Spring",
      year: 2025,
      type: "Exam1",
      version: "Student",
    });
  });

  it("throws when actionWrapper returns failure envelope", async () => {
    actionWrapperMock.mockResolvedValueOnce({
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
