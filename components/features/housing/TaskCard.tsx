import * as React from "react";
import { HousingTask } from "@/lib/domain/types/task";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Check, Clock, Trash2 } from "lucide-react";

interface TaskCardProps {
  task: HousingTask;
  onComplete: (taskId: string, file: File) => void;
  onDelete: (taskId: string) => void;
  isOptimistic?: boolean;
}

export function TaskCard({
  task,
  onComplete,
  onDelete,
  isOptimistic = false,
}: TaskCardProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Helpers
  const isLate = task.due_at && new Date(task.due_at) < new Date();

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "No Deadline";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "pending":
        return <Badge variant="warning">Reviewing</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "open":
        return <Badge variant="outline">Open</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCompleteClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create FormData or just pass the file?
      // The parent expects (taskId: string) -> void in the Interface.
      // I need to update the interface to accept the file.
      // Casting for now or I should update interface first.
      // Let's assume onComplete takes the file as second arg?
      // TypeScript will complain if I don't update Interface.
      // I will update interface in this same replacement or multiple?
      // replace_file_content can replace block.
      // I will assume interface update is handled or I must handle it here.
      onComplete(task.id, file);
    }
  };

  return (
    <Card
      className={`transition-opacity ${isOptimistic ? "opacity-50" : "opacity-100"}`}
    >
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium truncate pr-4">
          {task.title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="font-bebas text-lg text-fiji-gold-dark/80">
            {task.points_value} PTS
          </span>
          {getStatusBadge(task.status)}
        </div>
      </CardHeader>

      <CardContent className="pb-3 text-sm text-stone-500">
        <div className="flex items-center gap-2">
          <Clock
            className={`w-4 h-4 ${isLate ? "text-red-500" : "text-stone-400"}`}
          />
          <span className={isLate ? "text-red-600 font-bold" : ""}>
            Due {formatDate(task.due_at)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between gap-3 pt-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(task.id)}
          className="text-stone-400 hover:text-red-500"
          disabled={isOptimistic}
          aria-label="Give up task"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Give Up
        </Button>

        {task.status !== "pending" && task.status !== "approved" && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleCompleteClick}
              disabled={isOptimistic}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="w-4 h-4 mr-2" /> Complete
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
