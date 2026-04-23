import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl border border-transparent text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground shadow-[var(--shadow-surface)] hover:shadow-[var(--shadow-raised)] hover:brightness-105 active:shadow-[var(--shadow-surface)] active:brightness-95",
        primary:
          "bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground shadow-[var(--shadow-surface)] hover:shadow-[var(--shadow-raised)] hover:brightness-105 active:shadow-[var(--shadow-surface)] active:brightness-95",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--shadow-surface)] hover:shadow-[var(--shadow-raised)] hover:brightness-105 active:shadow-[var(--shadow-surface)] active:brightness-95",
        surface:
          "border-border bg-surface text-foreground shadow-[var(--shadow-surface)] hover:bg-surface-muted hover:shadow-[var(--shadow-raised)] active:shadow-[var(--shadow-surface)]",
        outline:
          "border-border bg-surface text-foreground shadow-[var(--shadow-surface)] hover:bg-surface-muted hover:shadow-[var(--shadow-raised)] active:shadow-[var(--shadow-surface)]",
        danger:
          "bg-danger text-danger-foreground shadow-[var(--shadow-surface)] hover:shadow-[var(--shadow-raised)] hover:brightness-105 active:shadow-[var(--shadow-surface)] active:brightness-95",
        ghost: "text-foreground hover:bg-surface-muted",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-11 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

const spinnerSize: Record<"default" | "sm" | "lg", string> = {
  default: "size-4",
  sm: "size-3.5",
  lg: "size-[1.1rem]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export function Button({ className, variant, size, loading, disabled, children, ...props }: ButtonProps) {
  const isBusy = Boolean(loading);
  return (
    <button
      className={cn(
        buttonVariants({ variant, size, className }),
        isBusy && "gap-2",
      )}
      disabled={disabled || isBusy}
      aria-busy={isBusy || undefined}
      data-loading={isBusy ? "" : undefined}
      {...props}
    >
      {isBusy ? (
        <Loader2
          className={cn("shrink-0 animate-spin", spinnerSize[(size ?? "default") as keyof typeof spinnerSize])}
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}
