"use client";

import { useState } from "react";
import { HousingTask } from "@/lib/domain/entities";
import {
  Briefcase,
  RefreshCw,
  Zap,
  Clock,
  UploadCloud,
  XCircle,
  CheckCircle,
} from "lucide-react";
import { TimeDisplay } from "../TimeDisplay";
import { Loader } from "@/components/ui/Loader";
import toast from "react-hot-toast";
import {
  claimTaskAction,
  unclaimTaskAction, // Note: Import paths might need adjusting if they changed?
  submitProofAction,
} from "@/lib/presentation/actions/housing/duty.actions";

interface DutyCardProps {
  task: HousingTask;
  userId: string;
  profileId?: string;
  getJWT: () => Promise<string>;
  onEdit?: (task: HousingTask) => void;
  variant?: "square" | "horizontal";
}

export default function DutyCard({
  task,
  userId,
  profileId,
  getJWT,
  onEdit,
  variant = "square",
}: DutyCardProps) {
  const [loading, setLoading] = useState(false);

  const isOneOff = task.type === "one_off";
  const isDuty = task.type === "duty" || task.type === "one_off";
  const isMyTask = task.assigned_to === (profileId || userId);
  const isReview = task.proof_s3_key && task.status === "pending";

  const handleClaim = async () => {
    if (isDuty) return;
    setLoading(true);
    try {
      const jwt = await getJWT();
      const res = await claimTaskAction(task.id, userId, jwt);
      if (!res.success) throw new Error(res.error);
      toast.success("Bounty Claimed!");
      window.location.reload();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error claiming task";
      toast.error(message);
    }
    setLoading(false);
  };

  const handleUnclaim = async () => {
    setLoading(true);
    try {
      const jwt = await getJWT();
      const res = await unclaimTaskAction(task.id, jwt);
      if (!res.success) throw new Error(res.error);
      toast.success("Unclaimed");
      window.location.reload();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error unclaiming task";
      toast.error(message);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", task.id);
      const jwt = await getJWT();
      const result = await submitProofAction(formData, jwt);
      if (!result.success) throw new Error(result.error);
      toast.success("Proof uploaded!");
      window.location.reload();
    } catch (err: unknown) {
      console.error("Upload error:", err);
      toast.error(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const containerClasses = `relative bg-white border rounded-xl p-5 transition-all shadow-sm hover:shadow-md h-full group ${
    isMyTask && task.status === "pending" && !isReview
      ? "border-fiji-purple ring-1 ring-fiji-purple/20 bg-purple-50/10"
      : "border-stone-200"
  } ${isReview ? "opacity-60 grayscale-[80%] bg-stone-50" : ""}`;

  // RENDER ACTION BUTTONS HELPER
  const renderActions = (btnClass = "w-full") => (
    <>
      {/* Claim (Square Bounty) */}
      {task.status === "open" && !isDuty && (
        <button
          onClick={handleClaim}
          disabled={loading}
          className={`${btnClass} font-bold py-2 rounded text-sm transition-colors bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900 border border-stone-200 flex items-center justify-center gap-2`}
        >
          {loading ? (
            <>
              <Loader size="sm" className="text-stone-500" />
              <span>Claiming...</span>
            </>
          ) : (
            "Claim Bounty"
          )}
        </button>
      )}

      {/* Upload / Unclaim (My Task) */}
      {isMyTask &&
        (task.status === "pending" ||
          task.status === "rejected" ||
          (isDuty && task.status === "open")) &&
        !isReview && (
          <div
            className={`flex gap-2 ${btnClass === "w-full" ? "w-full" : "w-auto items-center"}`}
          >
            <label
              className={`${btnClass === "w-full" ? "flex-1" : "px-4"} bg-fiji-purple hover:bg-fiji-dark text-white py-2 rounded text-sm font-bold text-center cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0 ${
                loading || (task.due_at && new Date() > new Date(task.due_at))
                  ? "opacity-50 pointer-events-none grayscale"
                  : ""
              }`}
            >
              {loading ? (
                <Loader size="sm" className="text-white" />
              ) : task.due_at && new Date() > new Date(task.due_at) ? (
                <>
                  <Clock className="w-4 h-4" /> Expired
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" /> Upload
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleUpload}
                disabled={
                  loading ||
                  (!!task.due_at && new Date() > new Date(task.due_at))
                }
              />
            </label>
            {!isDuty && (
              <button
                onClick={handleUnclaim}
                disabled={loading}
                className="px-3 text-red-400 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors h-full flex items-center justify-center"
                title="Unclaim"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

      {/* STATUS */}
      {task.status === "approved" && (
        <div
          className={`${btnClass} text-center text-xs text-green-600 font-bold py-2 flex items-center justify-center gap-2 bg-green-50 rounded border border-green-100`}
        >
          <CheckCircle className="w-3 h-3" /> Completed
        </div>
      )}
      {task.proof_s3_key && task.status === "pending" && (
        <div
          className={`${btnClass} text-center text-xs text-stone-500 font-bold py-2 flex items-center justify-center gap-2 bg-stone-50 rounded`}
        >
          <Clock className="w-3 h-3" /> Reviewing
        </div>
      )}
      {!task.proof_s3_key && task.status === "rejected" && (
        <div
          className={`${btnClass} text-center text-xs text-red-500 font-bold py-2 flex items-center justify-center gap-2 bg-red-50 rounded border border-red-100`}
        >
          <XCircle className="w-3 h-3" /> Rejected
        </div>
      )}
    </>
  );

  // === HORIZONTAL LAYOUT (Compact) ===
  if (variant === "horizontal") {
    return (
      <div
        className={`relative bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group h-auto ${isReview ? "opacity-60 grayscale-[80%] bg-stone-50" : ""}`}
      >
        {/* ICON */}
        <div
          className={`p-2.5 rounded-lg shrink-0 ${isOneOff ? "bg-indigo-50 text-indigo-600" : "bg-rose-50 text-rose-600"}`}
        >
          {isOneOff ? (
            <Briefcase className="w-5 h-5" />
          ) : (
            <RefreshCw className="w-5 h-5" />
          )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bebas text-xl text-stone-800 leading-none group-hover:text-fiji-dark transition-colors truncate pt-0.5">
              {task.title}
            </h3>
          </div>
          <p className="text-stone-500 text-xs line-clamp-1">
            {task.description || "No description provided."}
          </p>
        </div>

        {/* META & ACTIONS */}
        <div className="flex items-center gap-4 shrink-0">
          {/* POINTS & DUE DATE */}
          <div className="flex flex-col items-end justify-center gap-0.5 min-w-[80px]">
            {task.points_value > 0 && (
              <span className="font-bold text-stone-700 text-sm">
                {task.points_value} PTS
              </span>
            )}
            {task.due_at && (
              <TimeDisplay target={task.due_at} mode="deadline" />
            )}
          </div>

          {/* ACTION BUTTON */}
          <div className="w-[140px] flex justify-end">
            {renderActions("w-full")}
          </div>
        </div>
      </div>
    );
  }

  // === SQUARE LAYOUT (Default) ===
  return (
    <div className={`${containerClasses} flex flex-col`}>
      {/* HEADER */}
      <div className="flex justify-between items-start mb-3">
        <div>
          {isDuty ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] tracking-widest font-bold text-red-600 bg-red-50 border border-red-100 uppercase mb-2">
              {isOneOff ? (
                <Briefcase className="w-3 h-3" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {isOneOff ? "Assigned Duty" : "Recurring Duty"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] tracking-widest font-bold text-fiji-gold-dark bg-yellow-50 border border-yellow-100 uppercase mb-2">
              <Zap className="w-3 h-3" /> Bounty
            </span>
          )}
          <h3 className="font-bebas text-2xl text-stone-800 leading-none group-hover:text-fiji-dark transition-colors">
            {task.title}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          {!isDuty && (
            <span className="bg-fiji-gold text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
              {task.points_value} PTS
            </span>
          )}
          {task.due_at && <TimeDisplay target={task.due_at} mode="deadline" />}
          {!isDuty &&
            task.type === "bounty" &&
            task.expires_at &&
            task.status === "open" && (
              <TimeDisplay target={task.expires_at} mode="expiry" />
            )}
        </div>
      </div>

      <p className="text-stone-600 text-sm mb-4 flex-1 line-clamp-3 leading-relaxed">
        {task.description}
      </p>

      {/* FOOTER ACTIONS */}
      <div className="pt-3 border-t border-stone-100 space-y-2">
        {renderActions()}
      </div>
    </div>
  );
}
