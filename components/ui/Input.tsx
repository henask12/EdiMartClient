"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, hint, error, className, containerClassName, id, ...rest }, ref) => {
    const inputId =
      id ?? (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);
    return (
      <label className={cn("block", containerClassName)}>
        {label ? (
          <span className="mb-1.5 block text-sm font-medium text-text-muted">
            {label}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-lg border bg-surface px-3 text-sm text-text outline-none transition",
            "placeholder:text-text-muted/60",
            "focus:border-primary focus:ring-1 focus:ring-primary/30",
            error
              ? "border-danger focus:border-danger focus:ring-danger/30"
              : "border-border-strong",
            className,
          )}
          {...rest}
        />
        {hint && !error ? (
          <span className="mt-1 block text-xs text-text-muted">{hint}</span>
        ) : null}
        {error ? (
          <span className="mt-1 block text-xs text-danger">{error}</span>
        ) : null}
      </label>
    );
  },
);

Input.displayName = "Input";
