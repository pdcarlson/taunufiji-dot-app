"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  claimTaskAction,
  unclaimTaskAction,
  submitProofAction,
} from "@/lib/presentation/actions/housing.actions";
import toast from "react-hot-toast";

interface UseTaskActionsProps {
  taskId: string;
  userId: string;
  getJWT: () => Promise<string>;
}

export function useTaskActions({
  taskId,
  userId,
  getJWT,
}: UseTaskActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    router.refresh();
  };

  // Claim a Bounty
  const handleClaim = async () => {
    setLoading(true);
    try {
      const jwt = await getJWT();
      const res = await claimTaskAction(taskId, userId, jwt);
      if (!res.success) throw new Error(res.error);
      toast.success("Bounty Claimed!");
      refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error claiming task";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Unclaim a Bounty
  const handleUnclaim = async () => {
    setLoading(true);
    try {
      const jwt = await getJWT();
      const res = await unclaimTaskAction(taskId, jwt);
      if (!res.success) throw new Error(res.error);
      toast.success("Unclaimed");
      refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error unclaiming task";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Upload Proof
  const handleUpload = async (file: File) => {
    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", taskId);

      const jwt = await getJWT();
      const result = await submitProofAction(formData, jwt);

      if (!result.success) throw new Error(result.error);

      toast.success("Proof uploaded!");
      refresh();
    } catch (err: unknown) {
      console.error("Upload error:", err);
      toast.error(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleClaim,
    handleUnclaim,
    handleUpload,
  };
}
