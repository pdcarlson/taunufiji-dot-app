"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ImageIcon, RotateCcw, UploadCloud, X } from "lucide-react";
import toast from "react-hot-toast";
import { HousingTask } from "@/lib/domain/entities";
import { submitProofAction } from "@/lib/presentation/actions/housing/duty.actions";
import { Loader } from "@/components/ui/Loader";
import { uploadProofPhoto, type ProofUploadStage } from "./uploadProof";

type Phase = "review" | ProofUploadStage | "saving" | "error";

const PHASE_COPY: Record<ProofUploadStage | "saving", string> = {
  preparing: "Preparing photo…",
  uploading: "Uploading photo…",
  saving: "Saving submission…",
};

interface ProofUploadButtonProps {
  taskId: string;
  getJWT: () => Promise<string>;
  /** Called with the saved task after a successful submit. */
  onSubmitted: (task: HousingTask) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Proof submission built for phones: pick or take a photo, confirm it in a
 * bottom sheet, then submit with visible progress. A failed upload keeps the
 * photo so the member can tap "Try again" instead of finding it again.
 */
export function ProofUploadButton({
  taskId,
  getJWT,
  onSubmitted,
  disabled,
  className = "",
  children,
}: ProofUploadButtonProps) {
  const inputId = useId();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [phase, setPhase] = useState<Phase>("review");
  const [error, setError] = useState<string | null>(null);

  const busy =
    phase === "preparing" || phase === "uploading" || phase === "saving";

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewFailed(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    // Clear so picking the same photo again still fires onChange.
    e.target.value = "";
    if (!picked) return;
    setFile(picked);
    setError(null);
    setPhase("review");
  };

  const close = () => {
    if (busy) return;
    setFile(null);
    setError(null);
    setPhase("review");
  };

  const submit = async () => {
    if (!file || busy) return;
    setError(null);
    try {
      const jwt = await getJWT();
      const proofKey = await uploadProofPhoto(file, jwt, taskId, setPhase);
      setPhase("saving");
      const result = await submitProofAction({ taskId, proofKey }, jwt);
      if (!result.success) throw new Error(result.error);
      toast.success("Proof submitted for review!");
      setFile(null);
      setPhase("review");
      onSubmitted(result.data);
    } catch (err: unknown) {
      console.error("Proof submit failed:", err);
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
      setPhase("error");
    }
  };

  return (
    <>
      <label
        htmlFor={inputId}
        aria-disabled={disabled || undefined}
        className={`${className} ${
          disabled ? "opacity-50 pointer-events-none grayscale" : ""
        }`}
      >
        {children ?? (
          <>
            <UploadCloud className="w-4 h-4" /> Upload proof
          </>
        )}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handlePick}
        disabled={disabled || busy}
        data-testid="proof-file-input"
      />

      {file && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-150"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <h2
                id={titleId}
                className="font-bebas text-2xl text-stone-800 leading-none"
              >
                Submit this photo?
              </h2>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                aria-label="Cancel"
                className="p-2 -mr-2 rounded-full text-stone-500 hover:bg-stone-100 disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl bg-stone-100 overflow-hidden flex items-center justify-center min-h-40">
              {previewUrl && !previewFailed ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                <img
                  src={previewUrl}
                  alt="Selected proof"
                  className="w-full max-h-[50dvh] object-contain"
                  onError={() => setPreviewFailed(true)}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-6 text-stone-500 text-sm text-center">
                  <ImageIcon className="w-8 h-8" />
                  <span className="break-all">{file.name}</span>
                </div>
              )}
            </div>

            {busy && (
              <p
                className="mt-3 flex items-center gap-2 text-sm font-medium text-stone-600"
                role="status"
              >
                <Loader size="sm" className="text-fiji-purple" />
                {PHASE_COPY[phase as keyof typeof PHASE_COPY]}
              </p>
            )}

            {error && (
              <p
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="min-h-12 w-full rounded-xl bg-fiji-purple text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? (
                  <Loader size="sm" className="text-white" />
                ) : phase === "error" ? (
                  <>
                    <RotateCcw className="w-4 h-4" /> Try again
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" /> Submit proof
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="min-h-12 w-full rounded-xl border border-stone-300 text-stone-700 font-semibold text-base disabled:opacity-50"
              >
                Choose a different photo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
