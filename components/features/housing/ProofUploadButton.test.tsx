import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HousingTask } from "@/lib/domain/entities";

const hoisted = vi.hoisted(() => ({
  uploadProofPhoto: vi.fn(),
  submitProofAction: vi.fn(),
}));

vi.mock("./uploadProof", () => ({
  uploadProofPhoto: hoisted.uploadProofPhoto,
}));

vi.mock("@/lib/presentation/actions/housing/duty.actions", () => ({
  submitProofAction: hoisted.submitProofAction,
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import { ProofUploadButton } from "./ProofUploadButton";

const savedTask = {
  id: "t1",
  status: "pending",
  proof_s3_key: "proofs/tasks/t1/uuid/image.jpg",
} as HousingTask;

function pickPhoto() {
  const file = new File(["x"], "image.jpg", { type: "image/jpeg" });
  fireEvent.change(screen.getByTestId("proof-file-input"), {
    target: { files: [file] },
  });
  return file;
}

describe("ProofUploadButton", () => {
  const getJWT = vi.fn().mockResolvedValue("jwt");

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    hoisted.uploadProofPhoto.mockResolvedValue(savedTask.proof_s3_key);
    hoisted.submitProofAction.mockResolvedValue({
      success: true,
      data: savedTask,
    });
  });

  it("asks for confirmation before uploading the picked photo", () => {
    render(
      <ProofUploadButton taskId="t1" getJWT={getJWT} onSubmitted={vi.fn()} />,
    );

    pickPhoto();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByAltText("Selected proof")).toHaveAttribute(
      "src",
      "blob:preview",
    );
    expect(hoisted.uploadProofPhoto).not.toHaveBeenCalled();
  });

  it("uploads, submits the key, and hands back the saved task", async () => {
    const onSubmitted = vi.fn();
    render(
      <ProofUploadButton taskId="t1" getJWT={getJWT} onSubmitted={onSubmitted} />,
    );
    const file = pickPhoto();

    fireEvent.click(screen.getByRole("button", { name: /submit proof/i }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(savedTask));
    expect(hoisted.uploadProofPhoto).toHaveBeenCalledWith(
      file,
      "jwt",
      "t1",
      expect.any(Function),
    );
    expect(hoisted.submitProofAction).toHaveBeenCalledWith(
      { taskId: "t1", proofKey: savedTask.proof_s3_key },
      "jwt",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the photo after a failure so Try again works without re-picking", async () => {
    hoisted.uploadProofPhoto.mockRejectedValueOnce(
      new Error("Photo upload failed. Check your connection and try again."),
    );
    const onSubmitted = vi.fn();
    render(
      <ProofUploadButton taskId="t1" getJWT={getJWT} onSubmitted={onSubmitted} />,
    );
    pickPhoto();

    fireEvent.click(screen.getByRole("button", { name: /submit proof/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Check your connection",
    );
    expect(onSubmitted).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(savedTask));
    expect(hoisted.uploadProofPhoto).toHaveBeenCalledTimes(2);
  });

  it("shows the server's reason when the submit is refused", async () => {
    hoisted.submitProofAction.mockResolvedValueOnce({
      success: false,
      error: "Task is expired. You cannot submit late.",
    });
    render(
      <ProofUploadButton taskId="t1" getJWT={getJWT} onSubmitted={vi.fn()} />,
    );
    pickPhoto();

    fireEvent.click(screen.getByRole("button", { name: /submit proof/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("expired");
  });

  it("closes without uploading on cancel", () => {
    render(
      <ProofUploadButton taskId="t1" getJWT={getJWT} onSubmitted={vi.fn()} />,
    );
    pickPhoto();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(hoisted.uploadProofPhoto).not.toHaveBeenCalled();
  });
});
