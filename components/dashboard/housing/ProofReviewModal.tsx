"use client";

import {
  approveTaskAction,
  rejectTaskAction,
  getReviewDetailsAction,
} from "@/lib/presentation/actions/housing.actions";
import { account } from "@/lib/infrastructure/persistence/appwrite.web";
import { X, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Loader } from "@/components/ui/Loader";

import { HousingTask } from "@/lib/domain/entities";

// ...

interface ProofReviewModalProps {
  task: HousingTask | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProofReviewModal({
  task,
  onClose,
  onSuccess,
}: ProofReviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<{
    name: string;
    url: string;
    loading: boolean;
  }>({
    name: "Loading...",
    url: "",
    loading: true,
  });

  useEffect(() => {
    if (!task) return;

    const fetchDetails = async () => {
      try {
        const { jwt } = await account.createJWT();
        const res = await getReviewDetailsAction(task.id, jwt);
        if (res.success && res.data) {
          setDetails({
            name: res.data.submitterName || "Brother",
            url: res.data.proofUrl || "",
            loading: false,
          });
        } else {
          setDetails((prev) => ({
            ...prev,
            loading: false,
            name: "Error fetching",
          }));
        }
      } catch (e) {
        console.error(e);
        setDetails((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchDetails();
  }, [task]);

  if (!task) return null;

  const imageUrl = details.url;

  const handleApprove = async () => {
    // Confirmation Removed per request

    setLoading(true);
    try {
      const { jwt } = await account.createJWT();
      const res = await approveTaskAction(task.id, jwt);
      if (!res.success) throw new Error(res.error);
      toast.success("Task Approved! Points Awarded.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    let reason = prompt("Enter rejection reason (optional):");
    if (reason === null) return; // Cancelled
    if (reason.trim() === "") reason = "No reason provided.";

    setLoading(true);
    try {
      const { jwt } = await account.createJWT();
      const res = await rejectTaskAction(task.id, reason, jwt);
      if (!res.success) throw new Error(res.error);
      toast.error("Proof Rejected.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Rejection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[80vh] md:h-[600px] animate-in fade-in zoom-in-95">
        {/* Left: Image (Dark Side) */}
        <div className="w-full md:w-2/3 bg-stone-900 flex items-center justify-center relative overflow-hidden group">
          {imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Proof"
                className="max-w-full max-h-full object-contain"
              />
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </>
          ) : details.loading ? (
            <div className="text-stone-500 flex flex-col items-center animate-pulse">
              <Loader size="lg" className="text-stone-600 mb-2" />
              <p>Loading Proof...</p>
            </div>
          ) : (
            <div className="text-stone-500 flex flex-col items-center">
              <AlertTriangle className="w-12 h-12 mb-2" />
              <p>No Image Found</p>
            </div>
          )}
        </div>

        {/* Right: Details & Actions */}
        <div className="w-full md:w-1/3 flex flex-col bg-white border-l border-stone-200">
          {/* Header */}
          <div className="p-6 border-b border-stone-100 flex justify-between items-start">
            <div>
              <h2 className="font-bebas text-3xl text-stone-800">
                Review Proof
              </h2>
              <p className="text-sm text-stone-500">
                Submitted by{" "}
                <span className="font-bold text-fiji-purple">
                  {details.loading ? "..." : details.name}
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Task Info */}
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="mb-4">
              <label className="text-xs font-bold text-stone-400 uppercase">
                Task
              </label>
              <p className="font-bold text-lg leading-tight">{task.title}</p>
            </div>
            <div className="mb-4">
              <label className="text-xs font-bold text-stone-400 uppercase">
                Description
              </label>
              <p className="text-stone-600 text-sm">{task.description}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-stone-400 uppercase">
                Reward
              </label>
              <p className="font-bebas text-2xl text-fiji-gold-dark">
                {task.points_value} PTS
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 bg-stone-50 border-t border-stone-200 grid grid-cols-2 gap-4">
            <button
              onClick={handleReject}
              disabled={loading}
              className="w-full py-3 rounded-lg border-2 border-red-500 text-red-600 font-bold hover:bg-red-50 transition-colors flex justify-center items-center gap-2"
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              className="w-full py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-green-200"
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <Check className="w-5 h-5" /> Approve
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
