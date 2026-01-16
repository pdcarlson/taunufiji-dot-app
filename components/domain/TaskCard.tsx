"use client";

import { Models } from "appwrite";
import { CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { AssignmentSchema } from "@/lib/types/schema";
import { useState } from "react";
import { toast } from "react-hot-toast";

import {
  claimTaskAction,
  submitProofAction,
} from "@/lib/actions/housing.actions";
import { useAuth } from "@/components/auth/AuthProvider";

interface TaskCardProps {
  task: Models.Document & AssignmentSchema;
  onRefresh: () => void;
}

export default function TaskCard({ task, onRefresh }: TaskCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await claimTaskAction(task.$id, user.$id);
      if (res.success) {
        toast.success("Task claimed!");
        onRefresh();
      } else {
        toast.error("Failed to claim task.");
      }
    } catch (e) {
      toast.error("Failed to claim task.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    document.getElementById(`file-${task.$id}`)?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("taskId", task.$id);
    formData.append("file", file);

    try {
      const res = await submitProofAction(formData);
      if (res.success) {
        toast.success("Proof submitted!");
        onRefresh();
      } else {
        toast.error(res.error || "Upload failed");
      }
    } catch (e) {
      toast.error("Upload failed");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    open: "bg-white border-l-4 border-fiji-blue",
    pending: "bg-fiji-gold/10 border-l-4 border-fiji-gold",
    approved: "bg-emerald-50 border-l-4 border-emerald-500",
    rejected: "bg-red-50 border-l-4 border-red-500",
    expired: "bg-stone-100 border-l-4 border-stone-300 opacity-60",
    locked: "bg-stone-50 border-l-4 border-stone-200 opacity-70",
  };

  return (
    <div
      className={`p-4 rounded-lg shadow-sm mb-3 transition-all ${
        statusColors[task.status] || "bg-white"
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {task.status === "open" && (
              <div className="text-xs font-bold uppercase text-fiji-blue bg-blue-100 px-2 py-0.5 rounded-full">
                Open
              </div>
            )}
            {task.status === "pending" && (
              <div className="text-xs font-bold uppercase text-fiji-dark bg-fiji-gold px-2 py-0.5 rounded-full">
                Pending
              </div>
            )}
            <span className="text-xs text-stone-400 font-mono">
              #{task.$id.substring(0, 4)}
            </span>
          </div>
          <h3 className="font-bebas text-xl text-stone-800 leading-tight">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-xs text-stone-500 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="font-bebas text-2xl text-fiji-purple">
            +{task.points_value}
          </div>
          <div className="text-[10px] text-stone-400 uppercase">Points</div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2 border-t border-stone-100 pt-3">
        {task.status === "open" && (
          <button
            onClick={handleClaim}
            disabled={loading}
            className="flex-1 bg-stone-900 text-white text-sm font-bold py-2 rounded-md hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Claiming..." : "Claim Task"}{" "}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {task.status === "pending" && task.assigned_to === user?.$id && (
          <>
            <input
              type="file"
              id={`file-${task.$id}`}
              className="hidden"
              onChange={handleFileChange}
              accept="image/*"
            />
            <button
              onClick={handleUploadClick}
              disabled={loading}
              className="flex-1 bg-fiji-blue text-white text-sm font-bold py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Submit Proof"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
