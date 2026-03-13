import { actionWrapper } from "@/lib/presentation/utils/action-handler";
import { getMetadataAction } from "./read.actions";

vi.mock("@/lib/presentation/utils/action-handler", () => ({
  actionWrapper: vi.fn(),
}));

describe("getMetadataAction", () => {
  const actionWrapperMock = vi.mocked(actionWrapper);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns metadata on success", async () => {
    actionWrapperMock.mockResolvedValue({
      success: true,
      data: {
        courses: { CSCI: [{ number: "1100", name: "Comp Sci 1" }] },
        professors: ["Cutler"],
      },
    });

    const result = await getMetadataAction("jwt-token");

    expect(result).toEqual({
      courses: { CSCI: [{ number: "1100", name: "Comp Sci 1" }] },
      professors: ["Cutler"],
    });
  });

  it("returns empty metadata by default on failure", async () => {
    actionWrapperMock.mockResolvedValue({
      success: false,
      error: "Authentication Required: No JWT provided.",
      errorCode: "AUTHENTICATION_REQUIRED",
    });

    const result = await getMetadataAction();

    expect(result).toEqual({ courses: {}, professors: [] });
  });

  it("throws when throwOnError is enabled", async () => {
    actionWrapperMock.mockResolvedValue({
      success: false,
      error: "Authentication Required: No JWT provided.",
      errorCode: "AUTHENTICATION_REQUIRED",
    });

    await expect(
      getMetadataAction(undefined, { throwOnError: true }),
    ).rejects.toThrow("Authentication Required: No JWT provided.");
  });
});
