"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimeDisplayProps {
  target: string;
  mode: "deadline" | "expiry" | "unlock";
}

export function TimeDisplay({ target, mode }: TimeDisplayProps) {
  const [text, setText] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const tick = () => {
      const targetTime = new Date(target).getTime();
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        setText(mode === "unlock" ? "Ready" : "Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) setText(`${days}d ${hours}h`);
      else if (hours > 0) setText(`${hours}h ${mins}m`);
      else setText(`${mins}m`);

      setIsUrgent(diff < 1000 * 60 * 60 * 4);
    };

    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [target, mode]);

  if (!target) return null;

  return (
    <span
      className={`text-xs font-bold flex items-center gap-1 ${
        isUrgent && mode !== "unlock"
          ? "text-red-500 animate-pulse"
          : "text-stone-500"
      }`}
    >
      <Clock className="w-3 h-3" />
      {mode === "deadline" && "Due: "}
      {mode === "unlock" && "Opens: "}
      {mode === "expiry" && "Expires: "}
      {text}
    </span>
  );
}
