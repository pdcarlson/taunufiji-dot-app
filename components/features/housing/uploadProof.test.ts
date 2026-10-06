const hoisted = vi.hoisted(() => ({
  presign: vi.fn(),
}));

vi.mock("@/lib/presentation/actions/housing/duty.actions", () => ({
  presignProofUploadAction: hoisted.presign,
}));

import { uploadProofPhoto } from "./uploadProof";

describe("uploadProofPhoto", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    hoisted.presign.mockResolvedValue({
      success: true,
      data: {
        key: "proofs/tasks/t1/uuid/image.jpg",
        uploadUrl: "https://bucket.s3.amazonaws.com/presigned",
        contentType: "image/jpeg",
      },
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs the photo straight to S3 and returns only the key", async () => {
    // 6MB: larger than Vercel's ~4.5MB function body cap that broke submits.
    const file = new File([new Uint8Array(6 * 1024 * 1024)], "image.jpg", {
      type: "image/jpeg",
    });

    const key = await uploadProofPhoto(file, "jwt", "t1");

    expect(key).toBe("proofs/tasks/t1/uuid/image.jpg");
    expect(hoisted.presign).toHaveBeenCalledWith(
      { filename: "image.jpg", contentType: "image/jpeg", taskId: "t1" },
      "jwt",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bucket.s3.amazonaws.com/presigned",
      expect.objectContaining({
        method: "PUT",
        body: file,
        headers: { "Content-Type": "image/jpeg" },
      }),
    );
  });

  it("refuses files over 10MB before asking for a URL", async () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.jpg", {
      type: "image/jpeg",
    });

    await expect(uploadProofPhoto(file, "jwt", "t1")).rejects.toThrow(
      "10MB",
    );
    expect(hoisted.presign).not.toHaveBeenCalled();
  });

  it("surfaces the server's reason when presign fails", async () => {
    hoisted.presign.mockResolvedValueOnce({
      success: false,
      error: "Task is expired. You cannot submit late.",
    });
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

    await expect(uploadProofPhoto(file, "jwt", "t1")).rejects.toThrow(
      "Task is expired",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a failed S3 PUT instead of submitting", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

    await expect(uploadProofPhoto(file, "jwt")).rejects.toThrow(
      "Photo upload failed (403)",
    );
  });

  it("reports a network failure in plain words", async () => {
    vi.useFakeTimers();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

    const pending = expect(uploadProofPhoto(file, "jwt")).rejects.toThrow(
      "Check your connection",
    );
    await vi.runAllTimersAsync();
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
