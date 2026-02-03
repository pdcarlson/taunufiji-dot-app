import { HousingTask } from "@/lib/domain/entities";
import { Loader } from "@/components/ui/Loader";
import { useTaskActions } from "@/hooks/useTaskActions";
import { TimeDisplay } from "../TimeDisplay";
import {
  Briefcase,
  RefreshCw,
  Zap,
  Clock,
  UploadCloud,
  XCircle,
  CheckCircle,
} from "lucide-react";

interface DutyCardProps {
  task: HousingTask;
  userId: string;
  getJWT: () => Promise<string>;
  onEdit?: (task: HousingTask) => void;
}

export default function DutyCard({
  task,
  userId,
  getJWT,
  onEdit,
}: DutyCardProps) {
  const { loading, handleUnclaim, handleUpload } = useTaskActions({
    taskId: task.id,
    userId,
    getJWT,
  });

  const isDuty = task.type === "duty" || task.type === "one_off";
  const isOneOff = task.type === "one_off";
  const isReview = task.proof_s3_key && task.status === "pending"; // Under Review

  return (
    <div
      onClick={() => onEdit?.(task)}
      className={`relative bg-white border rounded-xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col h-full group cursor-pointer ${
        task.status === "pending" && !isReview
          ? "border-fiji-purple ring-1 ring-fiji-purple/20"
          : "border-stone-200"
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
          <h3 className="font-bebas text-2xl text-stone-800 leading-none group-hover:text-fiji-purple transition-colors">
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
        </div>
      </div>

      <p className="text-stone-600 text-sm mb-4 flex-1 line-clamp-3 leading-relaxed">
        {task.description}
      </p>

      {/* FOOTER ACTIONS */}
      <div className="pt-3 border-t border-stone-100 space-y-2">
        {/* Status: Completed */}
        {task.status === "approved" && (
          <div className="text-center text-xs text-green-600 font-bold py-2 flex items-center justify-center gap-2 bg-green-50 rounded border border-green-100">
            <CheckCircle className="w-3 h-3" /> Completed
          </div>
        )}

        {/* Status: Under Review */}
        {task.proof_s3_key && task.status === "pending" && (
          <div className="text-center text-xs text-stone-500 font-bold py-2 flex items-center justify-center gap-2 bg-stone-50 rounded">
            <Clock className="w-3 h-3" /> Under Review
          </div>
        )}

        {/* Status: Rejected */}
        {!task.proof_s3_key && task.status === "rejected" && (
          <div className="text-center text-xs text-red-500 font-bold py-2 flex items-center justify-center gap-2 bg-red-50 rounded border border-red-100">
            <XCircle className="w-3 h-3" /> Rejected - Resubmit
          </div>
        )}

        {/* Action: Upload Proof (Pending, Rejected, or Open Duty) */}
        {(task.status === "pending" ||
          task.status === "rejected" ||
          (isDuty && task.status === "open")) &&
          !isReview && (
            <div
              className="flex gap-2"
              onClick={(e) => e.stopPropagation()} // Prevent card click
            >
              <label
                className={`flex-1 bg-fiji-purple hover:bg-fiji-dark text-white py-2 rounded text-sm font-bold text-center cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0 ${
                  loading ? "opacity-50 pointer-events-none grayscale" : ""
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
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                  disabled={loading}
                />
              </label>

              {/* Unclaim (Only for Bounties) */}
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
      </div>
    </div>
  );
}
