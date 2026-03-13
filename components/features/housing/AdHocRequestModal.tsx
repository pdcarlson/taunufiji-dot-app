"use client";

import { useState } from "react";
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

  const onSubmit = async (data: FieldValues) => {
    if (!selectedFile) {
      toast.error("Please attach a photo proof");
      return;
    }

    setLoading(true);
    try {
      const jwt = await getJWT();
      const points = parseInt(data.points);

      if (isNaN(points) || points < 1 || points > 100) {
        toast.error("Points must be between 1 and 100");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("points", points.toString());
      formData.append("file", selectedFile);

      const res = await requestAdHocAction(formData, jwt);
      if (res.success) {
        toast.success("Request Submitted!");
        onSuccess();
      } else {
        toast.error(res.error || "Failed to submit request");
      }
    } catch (e) {
      toast.error("An error occurred");
      console.error(e);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#111111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div>
            <h2 className="text-xl font-semibold text-white">Request Points</h2>
            <p className="text-sm text-zinc-400">
              Did something for the house? Get credit.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
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
                className={`flex items-center justify-center w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  selectedFile
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 text-zinc-400"
                }`}
              >
                {selectedFile ? (
                  <div className="flex items-center gap-2">
                    <Check size={18} />
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {selectedFile.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon size={20} />
                    <span className="text-sm">Click to upload photo</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-fiji-gold hover:bg-yellow-400 text-black rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
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
