import { HousingTask } from "@/lib/domain/entities";
import { Loader } from "@/components/ui/Loader";
import { useTaskActions } from "@/hooks/useTaskActions";

interface BountyCardProps {
  task: HousingTask;
  userId: string;
  getJWT: () => Promise<string>;
  onEdit?: (task: HousingTask) => void;
}

export default function BountyCard({
  task,
  userId,
  getJWT,
  onEdit,
}: BountyCardProps) {
  const { loading, handleClaim } = useTaskActions({
    taskId: task.id,
    userId,
    getJWT,
  });

  return (
    <div
      onClick={() => onEdit?.(task)}
      className="bg-white border border-stone-200 rounded-lg p-4 flex items-center gap-4 hover:shadow-md transition-shadow group cursor-pointer"
    >
      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bebas text-xl text-stone-800 truncate group-hover:text-fiji-purple transition-colors">
          {task.title}
        </h3>
        <p className="text-stone-500 text-sm truncate">{task.description}</p>
      </div>

      {/* Points */}
      <span className="bg-fiji-gold text-white text-sm font-bold px-3 py-1.5 rounded shadow-sm whitespace-nowrap">
        {task.points_value} PTS
      </span>

      {/* Claim Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClaim();
        }}
        disabled={loading}
        className="bg-fiji-purple hover:bg-fiji-dark text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader size="sm" className="text-white" />
            Claiming...
          </>
        ) : (
          "Claim"
        )}
      </button>
    </div>
  );
}
