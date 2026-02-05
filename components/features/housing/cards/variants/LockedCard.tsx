import { HousingTask } from "@/lib/domain/entities";
import { Lock } from "lucide-react";
import { TimeDisplay } from "../TimeDisplay";

interface LockedCardProps {
  task: HousingTask;
}

export default function LockedCard({ task }: LockedCardProps) {
  const isDuty = task.type === "duty" || task.type === "one_off";

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 flex flex-col h-full opacity-70 hover:opacity-100 transition-opacity">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] tracking-widest font-bold text-stone-400 uppercase flex items-center gap-1 bg-stone-200/50 px-2 py-1 rounded">
          <Lock className="w-3 h-3" /> {isDuty ? "Cooldown" : "Locked"}
        </span>
        {task.unlock_at && (
          <TimeDisplay target={task.unlock_at} mode="unlock" />
        )}
      </div>
      <h3 className="font-bebas text-xl text-stone-500 mb-1">{task.title}</h3>
      <p className="text-sm text-stone-400 line-clamp-2 mb-4">
        {task.description}
      </p>
    </div>
  );
}
