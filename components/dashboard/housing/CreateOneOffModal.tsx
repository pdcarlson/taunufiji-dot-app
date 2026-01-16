"use client";

import { createTaskAction } from "@/lib/actions/housing.actions";
import { account } from "@/lib/client/appwrite";
import { X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

interface CreateOneOffModalProps {
  onClose: () => void;
  onSuccess: () => void;
  members: any[];
}

export default function CreateOneOffModal({
  onClose,
  onSuccess,
  members,
}: CreateOneOffModalProps) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const { jwt } = await account.createJWT();

      const payload = {
        title: data.title,
        description: data.description,
        points_value: 0, // Default 0 for Duties
        assigned_to: data.assigned_to || undefined,
        due_at: new Date(data.due_at).toISOString(),
        type: "one_off" as const,
      };

      await createTaskAction(payload, jwt);
      toast.success("Duty Assigned");
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to assign duty");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
          <h2 className="font-bebas text-2xl text-stone-800">
            Assign One-Time Duty
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* TITLE */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
              Duty Title
            </label>
            <input
              {...register("title", { required: true })}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fiji-purple/20"
              placeholder="e.g. Clean the Grill"
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
              Description / Instructions
            </label>
            <textarea
              {...register("description", { required: true })}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fiji-purple/20 h-24 resize-none"
              placeholder="Detailed instructions..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* DUE DATE */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                Due Date
              </label>
              <input
                type="datetime-local"
                {...register("due_at", { required: true })}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fiji-purple/20"
              />
            </div>
          </div>

          {/* ASSIGNEE */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
              Assign To
            </label>
            <select
              {...register("assigned_to", { required: true })}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fiji-purple/20"
            >
              <option value="">-- Select Member --</option>
              {members.map((m) => (
                <option key={m.$id} value={m.$id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-800 hover:bg-black text-white font-bold py-3 rounded-lg transition-colors mt-4"
          >
            {loading ? "Assigning..." : "Assign Duty"}
          </button>
        </form>
      </div>
    </div>
  );
}
