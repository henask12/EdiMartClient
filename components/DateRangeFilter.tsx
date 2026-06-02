"use client";

import { DateInput } from "./DateInput";
import { Button } from "@/components/ui/Button";

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
      <Button type="button" variant="secondary" onClick={onApply} className="sm:mb-0.5">
        Apply
      </Button>
    ) : null}
  </div>
);
