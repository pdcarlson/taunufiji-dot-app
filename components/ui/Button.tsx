import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    // Base Utils
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    // Variants
    const variants = {
      default: "bg-fiji-purple text-white hover:bg-fiji-purple/90",
      destructive: "bg-red-500 text-stone-50 hover:bg-red-500/90",
      outline:
        "border border-stone-200 bg-white hover:bg-stone-100 hover:text-stone-900",
      secondary: "bg-stone-100 text-stone-900 hover:bg-stone-100/80",
      ghost: "hover:bg-stone-100 hover:text-stone-900",
      link: "text-stone-900 underline-offset-4 hover:underline",
    };

    // Sizes
    const sizes = {
      default: "h-11 px-4 py-2", // 44px for touch
      sm: "h-9 rounded-md px-3",
      lg: "h-12 rounded-md px-8", // 48px
      icon: "h-11 w-11", // 44px square
    };

    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ""}`;

    return <Comp className={combinedClassName} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button };
