import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    const variantStyles = {
      primary: "bg-primary text-on-primary hover:bg-primary-hover font-semibold",
      secondary: "border border-border bg-surface text-text hover:bg-surface-muted",
      ghost: "bg-transparent text-text hover:bg-surface-muted",
    };

    const sizeStyles = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-4 text-sm",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
