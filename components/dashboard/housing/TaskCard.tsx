"use client";

import { useState, useEffect } from "react";
import {
  claimTaskAction,
  unclaimTaskAction,
  submitProofAction,
} from "@/lib/actions/housing.actions";
import { account } from "@/lib/client/appwrite";
import { Loader } from "@/components/ui/Loader";
import {
  Clock,
  UploadCloud,
  RefreshCw,
  Zap,
  XCircle,
  Lock,
  Briefcase,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import { HousingTask } from "@/lib/types/models";

// Types (Ideally move to shared types file)
type Task = HousingTask;

// --- TIMER ---
function TimeDisplay({
  target,
  mode,
}: {
  target: string;
  mode: "deadline" | "expiry" | "unlock";
}) {
  const [text, setText] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const tick = () => {
      const targetTime = new Date(target).getTime();
      const now = new Date().getTime();
      let diff = targetTime - now;

      if (diff <= 0) {
        setText(mode === "unlock" ? "Ready" : "Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) setText(`${days}d ${hours}h`);
      else if (hours > 0) setText(`${hours}h ${mins}m`);
      else setText(`${mins}m`);

      setIsUrgent(diff < 1000 * 60 * 60 * 4);
    };

    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [target, mode]);

  if (!target) return null; // Safety check

  return (
    <span
      className={`text-xs font-bold flex items-center gap-1 ${
        isUrgent && mode !== "unlock"
          ? "text-red-500 animate-pulse"
          : "text-stone-500"
      }`}
    >
      <Clock className="w-3 h-3" />
      {mode === "deadline" && "Due: "}
      {mode === "unlock" && "Opens: "}
      {mode === "expiry" && "Expires: "}
      {text}
    </span>
  );
}

interface TaskCardProps {
  task: Task;
  userId: string;
  profileId?: string;
  userName: string;
  isAdmin: boolean;
  onRefresh: () => void;
  // NEW: Determines if we show Upload buttons or Review buttons
  viewMode?: "action" | "review";
  onReview?: (task: Task) => void;
  onEdit?: (task: Task) => void; // Added
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col h-[200px] animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-2">
          <div className="w-20 h-4 bg-stone-200 rounded" />
          <div className="w-32 h-6 bg-stone-200 rounded" />
        </div>
        <div className="w-16 h-6 bg-stone-200 rounded" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="w-full h-4 bg-stone-200 rounded" />
        <div className="w-3/4 h-4 bg-stone-200 rounded" />
      </div>
      <div className="pt-3 border-t border-stone-100">
        <div className="w-full h-8 bg-stone-200 rounded" />
      </div>
    </div>
  );
}

export default function TaskCard({
  task,
  userId,
  profileId,
  userName,
  isAdmin,
  onRefresh,
  viewMode = "action",
  onReview,
  onEdit, // Added
}: TaskCardProps) {
  const [loading, setLoading] = useState(false);

  // VALUES
  const isMyTask = task.assigned_to === profileId;
  const isDuty = task.type === "duty" || task.type === "one_off";
  const isOneOff = task.type === "one_off";
  const isLocked = task.status === "locked";
  const isPending = task.status === "pending"; // Claimed / In Progress
  const isReview = task.proof_s3_key && task.status === "pending"; // Needs Review

  // ACTIONS
  const handleClaim = async () => {
    if (isDuty) return;
    setLoading(true);
    try {
      const { jwt } = await account.createJWT();
      await claimTaskAction(task.$id, userId, jwt);
      toast.success("Bounty Claimed!");
      onRefresh();
    } catch {
      toast.error("Error");
    }
    setLoading(false);
  };

  const handleUnclaim = async () => {
    setLoading(true);
    try {
      const { jwt } = await account.createJWT();
      await unclaimTaskAction(task.$id, jwt);
      toast.success("Unclaimed");
      onRefresh();
    } catch {
      toast.error("Error");
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", task.$id);

      const { jwt } = await account.createJWT();
      const result = await submitProofAction(formData, jwt);

      if (!result.success) throw new Error(result.error);

      toast.success("Proof uploaded!");
      onRefresh();
    } catch (err: unknown) {
      console.error("Upload error:", err);
      toast.error(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // 1. LOCKED / COOLDOWN CARD
  if (isLocked) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 flex flex-col h-full opacity-70 hover:opacity-100 transition-opacity">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] tracking-widest font-bold text-stone-400 uppercase flex items-center gap-1 bg-stone-200/50 px-2 py-1 rounded">
            <Lock className="w-3 h-3" /> {isDuty ? "Cooldown" : "Locked"}
          </span>
          {task.unlock_at && (
            <TimeDisplay target={task.unlock_at} mode="unlock" />
          )}
        </div>
        <h3 className="font-bebas text-xl text-stone-500 mb-1">{task.title}</h3>
        <p className="text-sm text-stone-400 line-clamp-2 mb-4">
          {task.description}
        </p>
      </div>
    );
  }

  // 2. ACTIVE CARD
  return (
    <div
      className={`relative bg-white border rounded-xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col h-full group ${
        isMyTask && task.status === "pending" && !isReview
          ? "border-fiji-purple ring-1 ring-fiji-purple/20"
          : "border-stone-200"
      } ${
        isReview && viewMode !== "review"
          ? "opacity-60 grayscale-[80%] bg-stone-50"
          : ""
      }`}
    >
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

          {/* Always show Due Date if present */}
          {task.due_at && <TimeDisplay target={task.due_at} mode="deadline" />}
          {/* Only show Expiry for open bounties (irrelevant once claimed) */}
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
        {/* VIEW A: ACTION (My Task) */}
        {viewMode === "action" && (
          <>
            {task.status === "open" && !isDuty && (
              <button
                onClick={handleClaim}
                disabled={loading}
                className={`w-full font-bold py-2 rounded text-sm transition-colors bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900 border border-stone-200`}
              >
                Claim Bounty
              </button>
            )}
            {isMyTask &&
              (task.status === "pending" ||
                task.status === "rejected" ||
                (isDuty && task.status === "open")) &&
              !isReview && (
                <div className="flex gap-2">
                  <label
                    className={`flex-1 bg-fiji-purple hover:bg-fiji-dark text-white py-2 rounded text-sm font-bold text-center cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0 ${
                      loading
                        ? "opacity-80 cursor-wait pointer-events-none"
                        : ""
                    }`}
                  >
                    {loading ? (
                      <Loader size="sm" className="text-white" />
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" /> Upload Proof
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleUpload}
                      disabled={loading}
                    />
                  </label>
                  {!isDuty && (
                    <button
                      onClick={handleUnclaim}
                      disabled={loading}
                      className="px-3 text-red-400 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors"
                      title="Unclaim"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            {/* STATUS STATES */}
            {task.status === "approved" && (
              <div className="text-center text-xs text-green-600 font-bold py-2 flex items-center justify-center gap-2 bg-green-50 rounded border border-green-100">
                <CheckCircle className="w-3 h-3" /> Completed
              </div>
            )}
            {task.proof_s3_key && task.status === "pending" && (
              <div className="text-center text-xs text-stone-500 font-bold py-2 flex items-center justify-center gap-2 bg-stone-50 rounded">
                <Clock className="w-3 h-3" /> Under Review
              </div>
            )}
            {!task.proof_s3_key && task.status === "rejected" && (
              <div className="text-center text-xs text-red-500 font-bold py-2 flex items-center justify-center gap-2 bg-red-50 rounded border border-red-100">
                <XCircle className="w-3 h-3" /> Rejected - Please Resubmit
              </div>
            )}
          </>
        )}

        {/* VIEW B: REVIEW (Admin Queue) */}
        {viewMode === "review" && task.proof_s3_key && isAdmin && onReview && (
          <button
            onClick={() => onReview(task)}
            className="w-full bg-stone-800 hover:bg-black text-white font-bold py-2 rounded text-sm shadow-sm transition-all hover:shadow"
          >
            Review Proof
          </button>
        )}
      </div>
    </div>
  );
}
