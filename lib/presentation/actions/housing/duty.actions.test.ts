const hoisted = vi.hoisted(() => {
  const mockContainer = {
    authService: {
      getProfile: vi.fn(),
    },
    dutyService: {
      claimTask: vi.fn(),
      unclaimTask: vi.fn(),
      assertCanSubmitProof: vi.fn(),
      submitProof: vi.fn(),
      requestAdHocPoints: vi.fn(),
    },
    storageService: {
      getUploadUrl: vi.fn(),
      uploadFile: vi.fn(),
    },
  };

  const mockActionWrapper = vi.fn(
    async (
      action: (ctx: {
        container: typeof mockContainer;
        userId: string;
        account: null;
      }) => Promise<unknown>,
      options: unknown,
    ) => {
      try {
        const data = await action({
          container: mockContainer,
          userId: "auth_1",
          account: null,
        });
        return { success: true, data, options };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          options,
        };
      }
    },
  );

  return { mockContainer, mockActionWrapper };
});

vi.mock("@/lib/presentation/utils/action-handler", () => ({
  actionWrapper: hoisted.mockActionWrapper,
}));

import {
  claimTaskAction,
  presignProofUploadAction,
  requestAdHocAction,
  submitProofAction,
  unclaimTaskAction,
} from "./duty.actions";

const { mockContainer } = hoisted;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

describe("housing duty actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer.authService.getProfile.mockResolvedValue({
      discord_id: "discord_1",
    });
    mockContainer.dutyService.assertCanSubmitProof.mockResolvedValue({
      id: "task_1",
    });
    mockContainer.dutyService.submitProof.mockResolvedValue({ id: "task_1" });
    mockContainer.dutyService.requestAdHocPoints.mockResolvedValue({
      id: "adhoc_1",
    });
    mockContainer.dutyService.claimTask.mockResolvedValue({ id: "task_1" });
    mockContainer.dutyService.unclaimTask.mockResolvedValue({ id: "task_1" });
    mockContainer.storageService.getUploadUrl.mockResolvedValue(
      "https://s3.example/presigned",
    );
  });

  describe("presignProofUploadAction", () => {
    it("checks eligibility, then signs a unique key under the task", async () => {
      const res = await presignProofUploadAction(
        { filename: "image.jpg", contentType: "image/jpeg", taskId: "task_1" },
        "jwt",
      );

      expect(res.success).toBe(true);
      if (!res.success) return;
      expect(mockContainer.dutyService.assertCanSubmitProof).toHaveBeenCalledWith(
        "task_1",
        "discord_1",
      );
      expect(res.data.key).toMatch(
        new RegExp(`^proofs/tasks/task_1/${UUID}/image\\.jpg$`),
      );
      expect(res.data.contentType).toBe("image/jpeg");
      expect(mockContainer.storageService.getUploadUrl).toHaveBeenCalledWith(
        res.data.key,
        "image/jpeg",
      );
    });

    it("gives each upload of the same file name its own key", async () => {
      const input = {
        filename: "image.jpg",
        contentType: "image/jpeg",
        taskId: "task_1",
      };
      const a = await presignProofUploadAction(input, "jwt");
      const b = await presignProofUploadAction(input, "jwt");

      expect(a.success && b.success).toBe(true);
      if (!a.success || !b.success) return;
      expect(a.data.key).not.toBe(b.data.key);
    });

    it("does not issue a URL when the member cannot submit", async () => {
      mockContainer.dutyService.assertCanSubmitProof.mockRejectedValueOnce(
        new Error("Task is expired. You cannot submit late."),
      );

      const res = await presignProofUploadAction(
        { filename: "a.jpg", contentType: "image/jpeg", taskId: "task_1" },
        "jwt",
      );

      expect(res).toMatchObject({
        success: false,
        error: "Task is expired. You cannot submit late.",
      });
      expect(mockContainer.storageService.getUploadUrl).not.toHaveBeenCalled();
    });

    it("signs ad-hoc proofs under the member's own prefix", async () => {
      const res = await presignProofUploadAction(
        { filename: "IMG_0001.HEIC", contentType: "" },
        "jwt",
      );

      expect(res.success).toBe(true);
      if (!res.success) return;
      expect(mockContainer.dutyService.assertCanSubmitProof).not.toHaveBeenCalled();
      expect(res.data.key).toMatch(
        new RegExp(`^proofs/adhoc/discord_1/${UUID}/IMG_0001\\.HEIC$`),
      );
      expect(res.data.contentType).toBe("image/heic");
    });

    it("rejects non-image files", async () => {
      const res = await presignProofUploadAction(
        { filename: "x.svg", contentType: "image/svg+xml", taskId: "task_1" },
        "jwt",
      );

      expect(res.success).toBe(false);
      expect(mockContainer.storageService.getUploadUrl).not.toHaveBeenCalled();
    });

    it("rejects a missing file name", async () => {
      const res = await presignProofUploadAction(
        { filename: " ", contentType: "image/png" },
        "jwt",
      );

      expect(res).toMatchObject({ success: false, error: "Missing file name" });
    });

    it("fails when the profile is missing", async () => {
      mockContainer.authService.getProfile.mockResolvedValueOnce(null);

      const res = await presignProofUploadAction(
        { filename: "a.png", contentType: "image/png" },
        "jwt",
      );

      expect(res).toMatchObject({ success: false, error: "Profile not found" });
    });
  });

  describe("submitProofAction", () => {
    const validKey =
      "proofs/tasks/task_1/123e4567-e89b-12d3-a456-426614174000/image.jpg";

    it("attaches an uploaded key without handling file bytes", async () => {
      const res = await submitProofAction(
        { taskId: "task_1", proofKey: validKey },
        "jwt",
      );

      expect(res).toMatchObject({ success: true, data: { id: "task_1" } });
      expect(mockContainer.dutyService.submitProof).toHaveBeenCalledWith(
        "task_1",
        "discord_1",
        validKey,
      );
      // Regression: proofs used to be buffered through this action and hit
      // Vercel's request body cap for ordinary phone photos.
      expect(mockContainer.storageService.uploadFile).not.toHaveBeenCalled();
    });

    it("refuses a key issued for another task", async () => {
      const res = await submitProofAction(
        {
          taskId: "task_1",
          proofKey:
            "proofs/tasks/task_2/123e4567-e89b-12d3-a456-426614174000/image.jpg",
        },
        "jwt",
      );

      expect(res.success).toBe(false);
      expect(mockContainer.dutyService.submitProof).not.toHaveBeenCalled();
    });

    it("refuses missing data", async () => {
      const res = await submitProofAction(
        { taskId: "task_1", proofKey: "" },
        "jwt",
      );

      expect(res).toMatchObject({ success: false, error: "Missing data" });
    });

    it("fails when the profile is missing", async () => {
      mockContainer.authService.getProfile.mockResolvedValueOnce(null);

      const res = await submitProofAction(
        { taskId: "task_1", proofKey: validKey },
        "jwt",
      );

      expect(res).toMatchObject({ success: false, error: "Profile not found" });
    });
  });

  describe("requestAdHocAction", () => {
    const validKey =
      "proofs/adhoc/discord_1/123e4567-e89b-12d3-a456-426614174000/image.jpg";

    it("creates the request with the uploaded key", async () => {
      const res = await requestAdHocAction(
        { title: " Mopped ", description: "Hall", points: 5, proofKey: validKey },
        "jwt",
      );

      expect(res.success).toBe(true);
      expect(mockContainer.dutyService.requestAdHocPoints).toHaveBeenCalledWith(
        "discord_1",
        { title: "Mopped", description: "Hall", points: 5, proofKey: validKey },
      );
      expect(mockContainer.storageService.uploadFile).not.toHaveBeenCalled();
    });

    it("refuses another member's proof key", async () => {
      const res = await requestAdHocAction(
        {
          title: "t",
          description: "d",
          points: 5,
          proofKey:
            "proofs/adhoc/discord_2/123e4567-e89b-12d3-a456-426614174000/image.jpg",
        },
        "jwt",
      );

      expect(res.success).toBe(false);
      expect(mockContainer.dutyService.requestAdHocPoints).not.toHaveBeenCalled();
    });

    it.each([0, 101, 2.5, Number.NaN])("refuses %s points", async (points) => {
      const res = await requestAdHocAction(
        { title: "t", description: "d", points, proofKey: validKey },
        "jwt",
      );

      expect(res).toMatchObject({
        success: false,
        error: "Points must be between 1 and 100",
      });
    });

    it("refuses missing fields", async () => {
      const res = await requestAdHocAction(
        { title: "", description: "d", points: 5, proofKey: validKey },
        "jwt",
      );

      expect(res).toMatchObject({
        success: false,
        error: "Missing required fields",
      });
    });

    it("fails when the profile is missing", async () => {
      mockContainer.authService.getProfile.mockResolvedValueOnce(null);

      const res = await requestAdHocAction(
        { title: "t", description: "d", points: 5, proofKey: validKey },
        "jwt",
      );

      expect(res).toMatchObject({ success: false, error: "Profile not found" });
    });
  });

  describe("claim and unclaim", () => {
    it("claims with the member's discord id", async () => {
      const res = await claimTaskAction("task_1", "ignored", "jwt");

      expect(res.success).toBe(true);
      expect(mockContainer.dutyService.claimTask).toHaveBeenCalledWith(
        "task_1",
        "discord_1",
      );
    });

    it("unclaims with the member's discord id", async () => {
      const res = await unclaimTaskAction("task_1", "jwt");

      expect(res.success).toBe(true);
      expect(mockContainer.dutyService.unclaimTask).toHaveBeenCalledWith(
        "task_1",
        "discord_1",
      );
    });

    it("fails both when the profile is missing", async () => {
      mockContainer.authService.getProfile.mockResolvedValue(null);

      const claim = await claimTaskAction("task_1", "ignored", "jwt");
      const unclaim = await unclaimTaskAction("task_1", "jwt");

      expect(claim).toMatchObject({ success: false, error: "Profile not found" });
      expect(unclaim).toMatchObject({
        success: false,
        error: "Profile not found",
      });
    });
  });
});
