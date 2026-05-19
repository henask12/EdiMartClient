"use client";

import { DateInput } from "./DateInput";

type Props = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply?: () => void;
};

export const DateRangeFilter = ({ from, to, onFromChange, onToChange, onApply }: Props) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
    <DateInput label="From" value={from} onChange={onFromChange} className="flex-1" id="date-from" />
    <DateInput label="To" value={to} onChange={onToChange} className="flex-1" id="date-to" />
    {onApply ? (
      <button
        type="button"
        onClick={onApply}
        className="tap rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white sm:mb-1"
      >
        Apply
      </button>
    ) : null}
  </div>
);
