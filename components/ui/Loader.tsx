import { Loader2 } from "lucide-react";

export function Loader({
  className,
  size = "default",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <Loader2
      className={`${sizeClasses[size]} animate-spin text-fiji-gold ${
        className || ""
      }`}
    />
  );
}
