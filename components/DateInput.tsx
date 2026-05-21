"use client";

import { useRef } from "react";

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
    if (!el) {
      return;
    }
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  };

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="mb-2 block text-sm text-white/70">
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
          className="tap min-h-12 w-full flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 pr-12 text-base text-white outline-none focus:border-[var(--accent)] [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-12 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
          aria-label={label ?? "Pick a date"}
        />
        <button
          type="button"
          onClick={openCalendar}
          className="tap absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
          aria-label="Open calendar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5 text-white/70"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
      </div>
    </div>
  );
};
