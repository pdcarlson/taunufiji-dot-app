"use client";
import { useState } from "react";
import { useForm, FieldValues } from "react-hook-form";
import { X, Calendar, User, FileText, Check, Clock } from "lucide-react";
import { createScheduleAction } from "@/lib/actions/housing.actions";
import { account } from "@/lib/client/appwrite";
import toast from "react-hot-toast";

import { Member } from "@/lib/types/models";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  members?: Member[];
}

const DAYS = [
  { label: "Monday", value: "MO" },
  { label: "Tuesday", value: "TU" },
  { label: "Wednesday", value: "WE" },
  { label: "Thursday", value: "TH" },
  { label: "Friday", value: "FR" },
  { label: "Saturday", value: "SA" },
  { label: "Sunday", value: "SU" },
];

export default function CreateScheduleModal({
  onClose,
  onSuccess,
  members,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      assigned_to: "",
      freq_day: "FR",
      lead_time: 24,
    },
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: FieldValues) => {
    setLoading(true);
    try {
      const jwt = await account.createJWT();

      // RRule runs in UTC timezone
      // For 11:59 PM EST: EST is UTC-5, so 11:59 PM EST = 04:59 AM UTC (next day)
      // Shift to next day of week since 04:59 crosses midnight
      const dayShiftMap: Record<string, string> = {
        MO: "TU", // Monday 11:59 PM EST = Tuesday 04:59 AM UTC
        TU: "WE",
        WE: "TH",
        TH: "FR",
        FR: "SA",
        SA: "SU",
        SU: "MO",
      };
      const nextDay = dayShiftMap[data.freq_day];
      const rrule = `FREQ=WEEKLY;BYDAY=${nextDay};BYHOUR=4;BYMINUTE=59`;

      const payload = {
        title: data.title,
        description: data.description,
        recurrence_rule: rrule,
        lead_time_hours: Number(data.lead_time),
        points_value: 0,
        assigned_to: data.assigned_to || undefined,
        active: true,
      };

      const res = await createScheduleAction(payload, jwt.jwt);
      if (res.success) {
        toast.success("Schedule Created!");
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Failed to create schedule");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#111111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div>
            <h2 className="text-xl font-semibold text-white">
              New Recurring Task
            </h2>
            <p className="text-sm text-zinc-400">Set up a weekly schedule.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Task Title
            </label>
            <div className="relative group">
              <FileText
                className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-indigo-400 transition-colors"
                size={18}
              />
              <input
                {...register("title", { required: true })}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder:text-zinc-600"
                placeholder="e.g. Kitchen Clean"
              />
            </div>
            {errors.title && (
              <span className="text-red-400 text-xs">Required</span>
            )}
          </div>

          {/* Schedule Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Day of Week
              </label>
              <div className="relative group">
                <Calendar
                  className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-purple-400 transition-colors"
                  size={18}
                />
                <select
                  {...register("freq_day", { required: true })}
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none cursor-pointer"
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Defaults Info */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Deadline Time
              </label>
              <div className="w-full bg-zinc-900/30 border border-white/5 rounded-xl py-2.5 px-4 text-zinc-500 text-sm flex items-center gap-2">
                <Clock size={16} />
                <span>Default: 11:59 PM</span>
              </div>
            </div>
          </div>

          {/* Lead Time */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Unlock Lead Time (Hours)
            </label>
            <p className="text-[10px] text-zinc-500">
              How many hours before the deadline should this task become
              available?
            </p>
            <div className="relative group">
              <input
                type="number"
                {...register("lead_time", { required: true, min: 1 })}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="24"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600 resize-none"
              placeholder="Checklist items..."
            />
          </div>

          {/* Default Assignee */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex justify-between">
              <span>Default Assignee</span>
              <span className="text-zinc-600 normal-case tracking-normal">
                (Optional)
              </span>
            </label>
            <div className="relative group">
              <User
                className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-pink-400 transition-colors"
                size={18}
              />
              <select
                {...register("assigned_to")}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all appearance-none cursor-pointer"
              >
                <option value="">-- Floating / Open --</option>
                {members?.map((m: Member) => (
                  <option key={m.$id} value={m.discord_id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                "Creating..."
              ) : (
                <>
                  <span>Create Task</span>
                  <Check size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
