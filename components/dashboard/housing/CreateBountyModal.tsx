"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { X, Clock, DollarSign, FileText, Check } from "lucide-react";
import { createTaskAction } from "@/lib/actions/housing.actions";
import { account } from "@/lib/client/appwrite";
import toast from "react-hot-toast";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateBountyModal({ onClose, onSuccess }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
        const jwt = await account.createJWT();
        
        // No expiry for the offer itself (stays open until claimed)
        // Set execution_limit for the deadline calculation upon claim
        const days = parseInt(data.days);

        const payload = {
            title: data.title,
            description: data.description,
            points_value: parseInt(data.points),
            type: "bounty",
            status: "open",
            execution_limit: days
        };
        
        const res = await createTaskAction(payload, jwt.jwt);
        if (res.success) {
            toast.success("Bounty Posted!");
            onSuccess();
        } else {
             toast.error(res.error || "Failed to post bounty");
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
            <h2 className="text-xl font-semibold text-white">Post New Bounty</h2>
            <p className="text-sm text-zinc-400">Offer points for an optional task.</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            
            {/* Title */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Title</label>
                <div className="relative group">
                    <FileText className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-fiji-gold transition-colors" size={18} />
                    <input 
                        {...register("title", { required: true })}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-fiji-gold/50 focus:border-transparent transition-all placeholder:text-zinc-600"
                        placeholder="e.g. Fix Door Handle"
                    />
                </div>
                {errors.title && <span className="text-red-400 text-xs">Required</span>}
            </div>

            {/* Time Limit & Points Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Time to Complete</label>
                    <div className="relative group">
                        <Clock className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input 
                            type="number"
                            {...register("days", { required: true, min: 1 })}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            defaultValue={3}
                            placeholder="Days"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Points</label>
                    <div className="relative group">
                        <DollarSign className="absolute left-3 top-3 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                        <input 
                            type="number"
                            {...register("points", { required: true, min: 1 })}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
                            placeholder="50"
                            defaultValue={50}
                        />
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Description</label>
                <textarea 
                    {...register("description")}
                    rows={3}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-fiji-gold/50 transition-all placeholder:text-zinc-600 resize-none"
                    placeholder="Details..."
                />
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
                    className="px-6 py-2 bg-fiji-gold hover:bg-yellow-400 text-black rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? "Posting..." : (
                        <>
                            <span>Post Bounty</span>
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
