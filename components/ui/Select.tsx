"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  containerClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, className, containerClassName, id, children, ...rest }, ref) => {
    const selectId =
      id ?? (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);
    return (
      <label className={cn("block", containerClassName)}>
        {label ? (
          <span className="mb-1.5 block text-sm font-medium text-text-muted">
            {label}
          </span>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-text outline-none transition",
            "focus:border-primary focus:ring-1 focus:ring-primary/30",
            className,
          )}
          {...rest}
        >
          {children}
        </select>
      </label>
    );
  },
);

Select.displayName = "Select";
