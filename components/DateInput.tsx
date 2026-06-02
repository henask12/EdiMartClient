"use client";

import { useRef } from "react";
import { Calendar } from "@/lib/icons";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  className?: string;
  id?: string;
};

export const DateInput = ({
  label,
  value,
  onChange,
  min,
  max,
  required,
  className,
  id,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const openCalendar = () => {
    const el = inputRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  };

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="label mb-2">
          {label}
        </label>
      ) : null}
      <div className="relative flex items-stretch">
        <input
          ref={inputRef}
          id={id}
          type="date"
          required={required}
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "input pr-12 [color-scheme:dark]",
            "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-12 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
          )}
          aria-label={label ?? "Pick a date"}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <IconButton
            variant="ghost"
            aria-label="Open calendar"
            onClick={openCalendar}
            icon={<Calendar />}
          />
        </div>
      </div>
    </div>
  );
};
