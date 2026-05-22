"use client";

import { Select } from "@/components/ui/Select";

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
  <div className="flex items-center gap-2">
    <span className="text-xs text-white/55">Per page</span>
    <Select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Items per page"
      containerClassName="w-auto"
      className="h-9 w-20 py-0"
    >
      {options.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </Select>
  </div>
);
