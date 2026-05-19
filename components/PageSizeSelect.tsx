"use client";

type Props = {
  value: number;
  onChange: (size: number) => void;
  options?: number[];
};

export const PageSizeSelect = ({
  value,
  onChange,
  options = [12, 24, 48],
}: Props) => (
  <label className="flex items-center gap-2 text-xs text-white/55">
    <span>Per page</span>
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white"
      aria-label="Items per page"
    >
      {options.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  </label>
);
