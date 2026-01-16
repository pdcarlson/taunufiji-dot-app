"use client";

import { useState } from "react";
import { Plus, Clock, Users, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import CreateScheduleModal from "./CreateScheduleModal";
import toast from "react-hot-toast";

interface Schedule {
    $id: string;
    title: string;
    description: string;
    recurrence_rule: string;
    points_value: number;
    assigned_to?: string;
    active: boolean;
    last_generated_at?: string;
}

interface Props {
    schedules: Schedule[];
    members: any[];
}

export default function ScheduleManager({ schedules, members }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    const handleSuccess = () => {
        setIsModalOpen(false);
        router.refresh(); // Reload Server Data
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Recurring Tasks</h2>
                    <p className="text-zinc-400">Manage templates for recurring duties.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                    <Plus size={18} />
                    <span>New Task</span>
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedules.length === 0 ? (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                        <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-500 font-medium">No schedules defined yet.</p>
                        <button onClick={() => setIsModalOpen(true)} className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 font-medium">
                            Create the first one
                        </button>
                    </div>
                ) : (
                    schedules.map((sched) => (
                        <div key={sched.$id} className="group relative bg-[#111111] hover:bg-[#161616] border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all duration-200">
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">{sched.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                        <span className={`w-2 h-2 rounded-full ${sched.active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                        <span>{sched.active ? 'Active' : 'Paused'}</span>
                                        <span>•</span>
                                        <span>Every {sched.recurrence_rule} Days</span>
                                    </div>
                                </div>
                                <div className="bg-zinc-900 rounded-lg px-2 py-1 flex items-center gap-1 text-emerald-400 text-xs font-medium border border-white/5">
                                    <span>+{sched.points_value}</span>
                                    <span className="text-[10px] text-emerald-500/70">PTS</span>
                                </div>
                            </div>

                            <p className="text-sm text-zinc-400 line-clamp-2 mb-4 h-10">
                                {sched.description || "No description provided."}
                            </p>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <Users size={14} />
                                    <span>
                                        {sched.assigned_to 
                                            ? (members.find(m => m.$id === sched.assigned_to)?.full_name || sched.assigned_to)
                                            : 'Rotating / Open'}
                                    </span>
                                </div>
                                <button className="text-zinc-600 hover:text-white transition-colors">
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <CreateScheduleModal onClose={() => setIsModalOpen(false)} onSuccess={handleSuccess} members={members} />
            )}
        </div>
    );
}
