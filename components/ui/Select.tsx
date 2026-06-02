"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  containerClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, className, containerClassName, id, children, ...rest }, ref) => {
    const selectId = id ?? (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);
    return (
      <label className={cn("block", containerClassName)}>
        {label ? <span className="label mb-2">{label}</span> : null}
        <select ref={ref} id={selectId} className={cn("select", className)} {...rest}>
          {children}
        </select>
      </label>
    );
  },
);

Select.displayName = "Select";
