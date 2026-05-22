"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  containerClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, hint, className, containerClassName, id, ...rest }, ref) => {
    const inputId = id ?? (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);
    return (
      <label className={cn("block", containerClassName)}>
        {label ? (
          <span className={cn("label", hint ? "mb-1" : "mb-2")}>{label}</span>
        ) : null}
        <input ref={ref} id={inputId} className={cn("input", className)} {...rest} />
        {hint ? <span className="mt-1 block text-xs text-white/45">{hint}</span> : null}
      </label>
    );
  },
);

Input.displayName = "Input";
