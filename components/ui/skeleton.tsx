import * as React from "react";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-stone-200/50 ${className || ""}`}
      {...props}
    />
  );
}

export { Skeleton };
