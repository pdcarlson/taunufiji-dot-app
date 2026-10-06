"use client";

import { useEffect, useState } from "react";
import { useForm, FieldValues } from "react-hook-form";
import {
  X,
  DollarSign,
  FileText,
  Check,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { requestAdHocAction } from "@/lib/presentation/actions/housing/duty.actions";
import { useJWT } from "@/hooks/useJWT";
import { uploadProofPhoto, type ProofUploadStage } from "./uploadProof";

const STAGE_COPY: Record<ProofUploadStage | "saving", string> = {
  preparing: "Preparing photo…",
  uploading: "Uploading photo…",
  saving: "Submitting…",
};
import toast from "react-hot-toast";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdHocRequestModal({ onClose, onSuccess }: Props) {
  const { getJWT } = useJWT();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<ProofUploadStage | "saving">("preparing");

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const onSubmit = async (data: FieldValues) => {
    if (!selectedFile) {
      toast.error("Please attach a photo proof");
      return;
    }

    setLoading(true);
    setStage("preparing");
    try {
      const jwt = await getJWT();
      const points = parseInt(data.points);

      if (isNaN(points) || points < 1 || points > 100) {
        toast.error("Points must be between 1 and 100");
        setLoading(false);
        return;
      }

      const proofKey = await uploadProofPhoto(
        selectedFile,
        jwt,
        undefined,
        setStage,
      );
      setStage("saving");
      const res = await requestAdHocAction(
        {
          title: data.title,
          description: data.description,
          points,
          proofKey,
        },
        jwt,
      );
      if (res.success) {
        toast.success("Request Submitted!");
        onSuccess();
      } else {
        toast.error(res.error || "Failed to submit request");
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Bottom sheet on phones; scrolls so Submit stays reachable with the keyboard open. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Request points"
        className="relative w-full max-w-lg bg-[#111111] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-white/5 bg-[#161616]">
          <div>
            <h2 className="text-xl font-semibold text-white">Request Points</h2>
            <p className="text-sm text-zinc-400">
              Did something for the house? Get credit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-4 sm:p-6 space-y-5 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              What did you do?
            </label>
            <div className="relative group">
              <FileText
                className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-fiji-gold transition-colors"
                size={18}
              />
              <input
                {...register("title", { required: true })}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-fiji-gold/50 focus:border-transparent transition-all placeholder:text-zinc-600"
                placeholder="e.g. Fixed the hallway light"
              />
            </div>
            {errors.title && (
              <span className="text-red-400 text-xs">Required</span>
            )}
          </div>

          {/* Points */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Points Requested (Max 100)
            </label>
            <div className="relative group">
              <DollarSign
                className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-emerald-400 transition-colors"
                size={18}
              />
              <input
                type="number"
                inputMode="numeric"
                {...register("points", { required: true, min: 1, max: 100 })}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
                placeholder="10"
                defaultValue={10}
              />
            </div>
            {errors.points && (
              <span className="text-red-400 text-xs">1-100 Points Only</span>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Description
            </label>
            <textarea
              {...register("description", { required: true })}
              rows={3}
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-fiji-gold/50 transition-all placeholder:text-zinc-600 resize-none"
              placeholder="Details..."
            />
            {errors.description && (
              <span className="text-red-400 text-xs">Required</span>
            )}
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Proof Photo
            </label>
            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`flex items-center justify-center w-full min-h-20 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  selectedFile
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 text-zinc-400"
                }`}
              >
                {selectedFile ? (
                  <div className="flex items-center gap-3 min-w-0">
                    {previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                      <img
                        src={previewUrl}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover shrink-0 bg-zinc-800"
                      />
                    )}
                    <div className="flex flex-col min-w-0 text-left">
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <Check size={16} /> Photo attached
                      </span>
                      <span className="text-xs text-emerald-300/70">
                        Tap to change
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon size={20} />
                    <span className="text-sm">Take or choose a photo</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-12 sm:min-h-11 justify-center px-6 py-2 bg-fiji-gold hover:bg-yellow-400 text-black rounded-xl text-base sm:text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{STAGE_COPY[stage]}</span>
                </>
              ) : (
                <>
                  <span>Submit Request</span>
                  <Check size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
