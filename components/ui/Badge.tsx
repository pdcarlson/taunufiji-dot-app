import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const baseStyles =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-stone-950 focus:ring-offset-2";

  const variants = {
    default:
      "border-transparent bg-stone-900 text-stone-50 hover:bg-stone-900/80",
    secondary:
      "border-transparent bg-stone-100 text-stone-900 hover:bg-stone-100/80",
    destructive:
      "border-transparent bg-red-500 text-stone-50 hover:bg-red-500/80",
    outline: "text-stone-950",
    success:
      "border-transparent bg-emerald-500 text-white hover:bg-emerald-600",
    warning: "border-transparent bg-amber-500 text-white hover:bg-amber-600",
  };

  const combinedClassName = `${baseStyles} ${variants[variant]} ${className || ""}`;

  return <div className={combinedClassName} {...props} />;
}

export { Badge };
