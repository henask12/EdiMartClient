"use client";

import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format-money";
import { cn } from "@/lib/cn";
import {
  type DenomCounts,
  totalFromDenoms,
} from "@/lib/shifts";

type Props = {
  denominations: string[];
  counts: DenomCounts;
  onChange: (next: DenomCounts) => void;
  disabled?: boolean;
  className?: string;
  /** Override the footer total label (defaults to "Counted total"). */
  totalLabel?: string;
};

export const DenominationCounter = ({
  denominations,
  counts,
  onChange,
  disabled,
  className,
  totalLabel,
}: Props) => {
  const t = useTranslations("Shifts");
  const total = totalFromDenoms(counts);

  const handleSet = (denom: string, qty: number) => {
    const safe = Math.max(0, Math.min(9999, Math.floor(qty) || 0));
    onChange({ ...counts, [denom]: safe });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <ul className="space-y-2" aria-label={t("denominationCounter")}>
        {denominations.map((denom) => {
          const qty = counts[denom] ?? 0;
          const line = Number(denom) * qty;
          const whole = Number(denom) % 1 === 0;
          return (
            <li
              key={denom}
              className="grid grid-cols-[5.75rem_minmax(0,1fr)_5.75rem] items-center gap-2 rounded-xl border border-border bg-surface-muted/40 px-3 py-2"
            >
              <span className="truncate font-semibold tabular-nums text-text">
                {formatMoney(denom, { decimals: !whole })}
              </span>
              <div className="flex items-center justify-center gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="size-11 shrink-0"
                  disabled={disabled || qty <= 0}
                  onClick={() => handleSet(denom, qty - 1)}
                  aria-label={t("decrease")}
                >
                  <Minus className="size-4" />
                </Button>
                <input
                  className={cn(
                    "h-11 w-14 shrink-0 rounded-lg border border-border-strong bg-surface px-1",
                    "text-center text-sm tabular-nums text-text outline-none transition",
                    "focus:border-primary focus:ring-1 focus:ring-primary/30",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                  inputMode="numeric"
                  value={String(qty)}
                  disabled={disabled}
                  onChange={(e) =>
                    handleSet(denom, Number(e.target.value.replace(/\D/g, "") || "0"))
                  }
                  aria-label={`${formatMoney(denom, { decimals: !whole })} ${t("count")}`}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="size-11 shrink-0"
                  disabled={disabled}
                  onClick={() => handleSet(denom, qty + 1)}
                  aria-label={t("increase")}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <span className="text-right tabular-nums text-sm text-text-muted">
                {formatMoney(line)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-sm font-medium text-text-muted">
          {totalLabel ?? t("countedTotal")}
        </span>
        <span className="text-2xl font-semibold tabular-nums text-text">
          {formatMoney(total)}
        </span>
      </div>
    </div>
  );
};
