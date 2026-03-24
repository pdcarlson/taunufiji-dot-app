"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HousingTask } from "@/lib/domain/entities";
import {
  Briefcase,
  RefreshCw,
  Zap,
  Clock,
  UploadCloud,
  XCircle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { TimeDisplay } from "../TimeDisplay";
import { Loader } from "@/components/ui/Loader";
import toast from "react-hot-toast";
import {
  claimTaskAction,
  unclaimTaskAction, // Note: Import paths might need adjusting if they changed?
  submitProofAction,
} from "@/lib/presentation/actions/housing/duty.actions";
import { isAwaitingExpiryTransition } from "@/lib/utils/housing-assignee-task-state";

interface DutyCardProps {
  task: HousingTask;
  userId: string;
  profileId?: string;
  getJWT: () => Promise<string>;
  onEdit?: (task: HousingTask) => void;
  variant?: "square" | "horizontal";
}

/**
 * Renders assignee-facing actions for a duty, one-off, or claimed bounty (square or horizontal layout).
 *
 * @param task - Housing row to display and act on.
 * @param userId - Authenticated Appwrite user id.
 * @param profileId - Optional Discord-linked profile id used as assignee key when set.
 * @param getJWT - Resolves a JWT for server actions.
 * @param variant - Card density: `"square"` (default) or `"horizontal"`.
 * @returns The interactive duty or bounty card UI.
 */
export function DutyCard({
  task,
  userId,
  profileId,
  getJWT,
  variant = "square",
}: Omit<DutyCardProps, 'onEdit'>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isOneOff = task.type === "one_off";
  const isDuty = task.type === "duty" || task.type === "one_off";
  const isMyTask = task.assigned_to === (profileId || userId);
  const isReview = task.proof_s3_key && task.status === "pending";
  const awaitingExpiryWrite = isAwaitingExpiryTransition(task);
  const uploadDisabledForDutyAwaitingExpiry =
    isDuty && awaitingExpiryWrite;
  const pastDueBlocksNonDutyUpload =
    !!task.due_at && new Date() > new Date(task.due_at) && !isDuty;
  const uploadControlDisabled =
    loading || pastDueBlocksNonDutyUpload || uploadDisabledForDutyAwaitingExpiry;

  const handleClaim = async () => {
    if (isDuty) return;
    setLoading(true);
    try {
      const jwt = await getJWT();
      const res = await claimTaskAction(task.id, userId, jwt);
      if (!res.success) throw new Error(res.error);
      toast.success("Bounty Claimed!");
      router.refresh();
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
      router.refresh();
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
      router.refresh();
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
    isMyTask &&
    task.status === "pending" &&
    !isReview &&
    !awaitingExpiryWrite
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

      {/* Duty: not completable (expired persisted, or overdue pending without proof) */}
      {isMyTask && isDuty && !isReview && task.status === "expired" && (
        <div
          className={`${btnClass} rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-xs text-amber-900`}
        >
          <p className="font-bold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Not completable
          </p>
          <p className="mt-1 text-amber-800/90 leading-snug">
            This task missed its deadline and is closed. Contact a housing admin
            if this looks wrong.
          </p>
        </div>
      )}

      {isMyTask &&
        isDuty &&
        !isReview &&
        awaitingExpiryWrite && (
          <div
            className={`${btnClass} rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-xs text-amber-900`}
          >
            <p className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Awaiting system update
            </p>
            <p className="mt-1 text-amber-800/90 leading-snug">
              This duty is past its due date and can no longer be completed here.
              The system or a housing admin will mark it expired shortly.
            </p>
          </div>
        )}

      {isMyTask &&
        (task.status === "pending" ||
          task.status === "rejected" ||
          (isDuty && task.status === "open")) &&
        !isReview &&
        !(isDuty && task.status === "pending" && awaitingExpiryWrite) &&
        !(!isDuty && task.status === "pending" && awaitingExpiryWrite) &&
        !(isDuty && task.status === "open" && awaitingExpiryWrite) && (
          <div
            className={`flex gap-2 ${btnClass === "w-full" ? "w-full" : "w-auto items-center"}`}
          >
            <label
              className={`${btnClass === "w-full" ? "flex-1" : "px-4"} bg-fiji-purple hover:bg-fiji-dark text-white py-2 rounded text-sm font-bold text-center cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0 ${
                uploadControlDisabled
                  ? "opacity-50 pointer-events-none grayscale"
                  : ""
              }`}
            >
              {loading ? (
                <Loader size="sm" className="text-white" />
              ) : pastDueBlocksNonDutyUpload ? (
                <>
                  <Clock className="w-4 h-4" /> Past due
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
                disabled={uploadControlDisabled}
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

      {isMyTask &&
        !isDuty &&
        !isReview &&
        task.status === "pending" &&
        awaitingExpiryWrite && (
          <div
            className={`${btnClass} space-y-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-left text-xs text-stone-700`}
          >
            <p className="font-bold text-stone-800">Past due — not completable</p>
            <p className="leading-snug text-stone-600">
              This bounty can no longer be completed. You can unclaim to return
              it to the pool.
            </p>
            <button
              type="button"
              onClick={handleUnclaim}
              disabled={loading}
              className="w-full rounded border border-red-200 bg-white py-2 text-xs font-bold text-red-600 hover:bg-red-50"
            >
              Unclaim bounty
            </button>
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

  // === HORIZONTAL LAYOUT (Compact & Responsive) ===
  if (variant === "horizontal") {
    return (
      <div
        className={`relative bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm hover:shadow-md transition-all group h-auto ${isReview ? "opacity-60 grayscale-[80%] bg-stone-50" : ""}`}
      >
        {/* ICON & CONTENT WRAPPER */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
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
        </div>

        {/* META & ACTIONS */}
        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-stone-100">
          {/* POINTS & DUE DATE */}
          <div className="flex flex-col items-start sm:items-end justify-center gap-0.5 min-w-[80px]">
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
