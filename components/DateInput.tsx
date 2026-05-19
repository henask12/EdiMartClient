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
          onClick={openCalendar}
          className="tap min-h-12 w-full flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 pr-12 text-base text-white outline-none focus:border-[var(--accent)] [color-scheme:dark]"
          aria-label={label ?? "Pick a date"}
        />
        <button
          type="button"
          onClick={openCalendar}
          className="tap absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-white/5 text-lg hover:bg-white/10"
          aria-label="Open calendar"
        >
          📅
        </button>
      </div>
    </div>
  );
};
