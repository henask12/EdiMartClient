"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/DateInput";
import {
  REPORT_PRESETS,
  type ReportPreset,
} from "@/lib/reporting";
import { cn } from "@/lib/cn";

type Props = {
  preset: ReportPreset;
  from: string;
  to: string;
  onPresetChange: (preset: ReportPreset) => void;
  onFromChange: (from: string) => void;
  onToChange: (to: string) => void;
  onApplyCustom?: () => void;
  className?: string;
};

export const PeriodPresetBar = ({
  preset,
  from,
  to,
  onPresetChange,
  onFromChange,
  onToChange,
  onApplyCustom,
  className,
}: Props) => {
  const t = useTranslations("Reports");

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t("period")}
      >
        {REPORT_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onPresetChange(p.value)}
            className={cn(
              "min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold transition focus-ring sm:min-h-0 sm:py-1.5",
              preset === p.value
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text",
            )}
            aria-pressed={preset === p.value}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <DateInput
            label={t("from")}
            value={from}
            onChange={onFromChange}
            className="flex-1"
            id="report-from"
          />
          <DateInput
            label={t("to")}
            value={to}
            onChange={onToChange}
            className="flex-1"
            id="report-to"
          />
          {onApplyCustom ? (
            <Button type="button" variant="secondary" size="sm" onClick={onApplyCustom}>
              {t("apply")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
