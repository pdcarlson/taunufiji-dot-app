import { useState, useEffect } from "react";
import {
  updateTaskAction,
  deleteTaskAction,
  getScheduleAction,
  updateScheduleLeadTimeAction,
} from "@/lib/presentation/actions/housing.actions";
import { useJWT } from "@/hooks/useJWT";
import { Member, HousingTask } from "@/lib/domain/entities";
import { Loader } from "@/components/ui/Loader";
import { X, Calendar, Edit2, Users, Clock, Trash2, Repeat } from "lucide-react";
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
  const { getJWT } = useJWT();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description,
    points_value: task.points_value,
    assigned_to: task.assigned_to || "",
    // Extract YYYY-MM-DD from ISO string
    due_at: task.due_at ? task.due_at.split("T")[0] : "",
    unlock_at: task.unlock_at ? task.unlock_at.split("T")[0] : "",
    execution_limit: task.execution_limit || undefined,
    lead_time_hours: 24, // Default, updated via fetch
  });

  const isBounty = task.type === "bounty";
  const isRecurring = !!task.schedule_id;
  const isAssigned = !!task.assigned_to;
  const canDelete = isBounty ? !isAssigned : true;

  // Fetch Schedule Details if Recurring
  useEffect(() => {
    if (isRecurring && task.schedule_id) {
      setInitialLoading(true);
      getScheduleAction(task.schedule_id)
        .then((res) => {
          if (res.success && res.data) {
            setFormData((prev) => ({
              ...prev,
              lead_time_hours: res.data.lead_time_hours || 24,
            }));
          }
        })
        .finally(() => setInitialLoading(false));
    }
  }, [isRecurring, task.schedule_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const jwt = await getJWT();

      // Validations
      if (Number(formData.points_value) < 0) {
        toast.error("Points cannot be negative");
        setLoading(false);
        return;
      }

      // Clean up data
      const payload: any = {
        title: formData.title,
        description: formData.description,
        points_value: isBounty ? Number(formData.points_value) : 0, // Force 0 for Duty
      };

      if (isBounty) {
        if (formData.execution_limit) {
          payload.execution_limit = Number(formData.execution_limit);
        }
      } else {
        // Duty Specific
        payload.assigned_to = formData.assigned_to || null;
        if (formData.due_at) {
          const dueIso = new Date(`${formData.due_at}T23:59:00`).toISOString();
          payload.due_at = dueIso;

          // Recalculate Unlock Logic if Recurring
          if (isRecurring) {
            const leadTime = Number(formData.lead_time_hours) || 24;
            const unlockDate = new Date(dueIso);
            unlockDate.setTime(
              unlockDate.getTime() - leadTime * 60 * 60 * 1000,
            );

            payload.unlock_at = unlockDate.toISOString();

            // Immediate Status Update
            const now = new Date();
            // If already legally open, ensure it's open.
            // But if it's "Approved" or "Pending", we shouldn't revert to "Open".
            // Only force status if it was "Locked" or "Open".
            // Actually, if we are editing, we are likely Admins fixing things.
            // Let's check current status?
            // "safe change": Only unlock if currently locked?
            // User complaint: "it still says opens in x days". This implies it is LOOKING locked.
            // So we definitely want to UNLOCK it if time is right.
            if (now >= unlockDate) {
              // Only override if it was locked.
              if (task.status === "locked") {
                payload.status = "open";
                payload.notification_level = "unlocked";
              }
            } else {
              // If we moved valid time to future, we should LOCK it.
              if (task.status === "open") {
                payload.status = "locked";
                payload.notification_level = "none";
              }
            }
          }
        }
      }

      // Parallel Actions
      const promises = [updateTaskAction(task.id, payload, jwt)];

      // If Recurring & Lead Time Changed, update Schedule
      if (isRecurring && task.schedule_id) {
        promises.push(
          updateScheduleLeadTimeAction(
            task.schedule_id,
            Number(formData.lead_time_hours),
            jwt,
          ),
        );
      }

      const [taskRes, scheduleRes] = await Promise.all(promises);

      // Check Task Update
      if (!taskRes.success) {
        throw new Error(taskRes.error || "Task update failed");
      }

      // Check Schedule Update (if strict? or just warn?)
      // Let's be strict per "Search and Destroy"
      if (scheduleRes && !scheduleRes.success) {
        throw new Error(scheduleRes.error || "Schedule update failed");
      }

      toast.success("Task updated");
      onRefresh();
      onClose();
    } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Failed to update task";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    if (!confirm("Are you sure you want to delete this task?")) return;

    setLoading(true);
    try {
      const jwt = await getJWT();
      const result = await deleteTaskAction(task.id, jwt);
      if (result.success) {
        toast.success("Task deleted");
        onRefresh();
        onClose();
      } else {
        toast.error(result.error || "Delete failed");
      }
    } catch {
      toast.error("Failed to delete");
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
              <Edit2 className="w-5 h-5 text-stone-400" /> Edit{" "}
              {isBounty
                ? "Bounty"
                : isRecurring
                  ? "Recurring Duty"
                  : "One-Off Duty"}
            </h2>
            <p className="text-xs text-stone-500 font-mono">{task.id}</p>
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
          {initialLoading && (
            <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
              <Loader size="lg" />
            </div>
          )}

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
            {/* Points (BOUNTY ONLY) */}
            {isBounty && (
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
            )}

            {/* Bounty: Execution Limit | Recurring: Lead Time | Duty: Assignee */}
            {isBounty ? (
              <div>
                <label className="block text-xs font-bold uppercase text-stone-500 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Time to Complete (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full text-sm text-stone-700 border border-stone-200 rounded-lg p-2 focus:border-fiji-purple outline-none"
                  value={formData.execution_limit || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      execution_limit: Number(e.target.value),
                    })
                  }
                  placeholder="3"
                />
              </div>
            ) : isRecurring ? (
              // RECURRING DUTY: Lead Time
              <div>
                <label className="block text-xs font-bold uppercase text-stone-500 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Lead Time (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full text-sm text-stone-700 border border-stone-200 rounded-lg p-2 focus:border-fiji-purple outline-none"
                  value={formData.lead_time_hours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lead_time_hours: Number(e.target.value),
                    })
                  }
                />
              </div>
            ) : (
              // ONE OFF DUTY: Spacer or nothing? maybe Assignee takes full width?
              // Let's keep grid and put Assignee in next block or here options?
              // Actually Assignee is separate below.
              <div className="hidden"></div>
            )}

            {/* Assignee if NOT Bounty (Already shown? No, loop logic below) */}
            {!isBounty && (
              <div className={isRecurring ? "" : "col-span-2"}>
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
                    <option key={m.id} value={m.discord_id}>
                      {m.full_name || m.discord_handle}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* DATES (Duty Only) */}
          {!isBounty && (
            <div className="grid grid-cols-2 gap-4">
              {/* Due Date */}
              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase text-stone-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Due Date
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full text-sm text-stone-600 border border-stone-200 rounded-lg p-2 outline-none"
                  value={formData.due_at}
                  onChange={(e) =>
                    setFormData({ ...formData, due_at: e.target.value })
                  }
                />
                <p className="text-[10px] text-stone-400 mt-1">12:00 PM</p>
              </div>

              {/* Unlock Date REMOVED per requirements */}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-between gap-3 pt-4 border-t border-stone-100 mt-2">
            <div>
              {/* DELETE BUTTON */}
              {/* Allow delete for bounties AND duties now? */}
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || loading}
                className="px-4 py-2 text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Delete Task"
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>

            <div className="flex gap-2">
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
          </div>
        </form>
      </div>
    </div>
  );
}
