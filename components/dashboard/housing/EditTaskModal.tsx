"use client";

import { useState, useEffect } from "react";
import { updateTaskAction } from "@/lib/actions/housing.actions";
import { account } from "@/lib/client/appwrite";
import { Member, HousingTask } from "@/lib/types/models";
import { Loader } from "@/components/ui/Loader";
import { X, Calendar, Edit2, Users } from "lucide-react";
import toast from "react-hot-toast";

interface EditTaskModalProps {
  task: HousingTask;
  members: Member[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function EditTaskModal({
  task,
  members,
  onClose,
  onRefresh,
}: EditTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description,
    points_value: task.points_value,
    assigned_to: task.assigned_to || "",
    due_at: task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : "",
    unlock_at: task.unlock_at
      ? new Date(task.unlock_at).toISOString().slice(0, 16)
      : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { jwt } = await account.createJWT();

      // Validations
      if (Number(formData.points_value) < 0) {
        toast.error("Points cannot be negative");
        setLoading(false);
        return;
      }

      if (formData.due_at && formData.unlock_at) {
        if (new Date(formData.unlock_at) > new Date(formData.due_at)) {
          toast.error("Unlock time cannot be after Due Date");
          setLoading(false);
          return;
        }
      }

      // Clean up data
      const payload: any = {
        title: formData.title,
        description: formData.description,
        points_value: Number(formData.points_value),
        assigned_to: formData.assigned_to || null, // Handle unassign
      };

      if (formData.due_at)
        payload.due_at = new Date(formData.due_at).toISOString();
      if (formData.unlock_at)
        payload.unlock_at = new Date(formData.unlock_at).toISOString();

      const result = await updateTaskAction(task.$id, payload, jwt);

      if (result.success) {
        toast.success("Task updated");
        onRefresh();
        onClose();
      } else {
        toast.error(result.error || "Update failed");
      }
    } catch (e) {
      toast.error("Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-stone-100 bg-stone-50">
          <div>
            <h2 className="text-xl font-bebas text-stone-800 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-stone-400" /> Edit Task
            </h2>
            <p className="text-xs text-stone-500 font-mono">{task.$id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase text-stone-500 mb-1">
              Title
            </label>
            <input
              type="text"
              required
              className="w-full text-lg font-bold text-stone-800 border-b-2 border-stone-200 focus:border-fiji-purple outline-none py-1 bg-transparent placeholder:text-stone-300 transition-colors"
              placeholder="Task Title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase text-stone-500 mb-1">
              Description
            </label>
            <textarea
              required
              rows={3}
              className="w-full text-sm text-stone-700 bg-stone-50 border border-stone-200 rounded-lg p-3 focus:ring-2 focus:ring-fiji-purple/20 focus:border-fiji-purple outline-none transition-all resize-none"
              placeholder="Describe the task..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Points */}
            <div>
              <label className="block text-xs font-bold uppercase text-stone-500 mb-1">
                Points Value
              </label>
              <input
                type="number"
                min="0"
                required
                className="w-full text-base font-mono text-stone-800 border border-stone-200 rounded-lg p-2 focus:border-fiji-purple outline-none"
                value={formData.points_value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    points_value: Number(e.target.value),
                  })
                }
              />
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-bold uppercase text-stone-500 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Assignee
              </label>
              <select
                className="w-full text-sm text-stone-700 border border-stone-200 rounded-lg p-2 focus:border-fiji-purple outline-none"
                value={formData.assigned_to}
                onChange={(e) =>
                  setFormData({ ...formData, assigned_to: e.target.value })
                }
              >
                <option value="">-- Unassigned --</option>
                {members.map((m) => (
                  <option key={m.$id} value={m.discord_id}>
                    {m.full_name || m.discord_handle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold uppercase text-stone-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due Date
                {task.type !== "bounty" && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                type="datetime-local"
                required={task.type !== "bounty"}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full text-sm text-stone-600 border border-stone-200 rounded-lg p-2 outline-none"
                value={formData.due_at}
                onChange={(e) =>
                  setFormData({ ...formData, due_at: e.target.value })
                }
              />
            </div>

            {/* Unlock Date */}
            <div>
              <label className="block text-xs font-bold uppercase text-stone-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Unlocks At
              </label>
              <input
                type="datetime-local"
                className="w-full text-sm text-stone-600 border border-stone-200 rounded-lg p-2 outline-none"
                value={formData.unlock_at}
                onChange={(e) =>
                  setFormData({ ...formData, unlock_at: e.target.value })
                }
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-stone-800 hover:bg-black text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader size="sm" className="text-white" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
