import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = {
  children: ReactNode;
  className?: string;
  padding?: boolean;
};

export const Card = ({ children, className, padding = true }: CardProps) => (
  <div
    className={cn(
      "rounded-xl border border-border bg-surface shadow-sm",
      padding && "p-5",
      className,
    )}
  >
    {children}
  </div>
);

type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  /** Percent change vs previous period, e.g. +12.5 or -3 */
  deltaPct?: number | null;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export const StatCard = ({
  label,
  value,
  detail,
  deltaPct,
  className,
  onClick,
  disabled,
}: StatCardProps) => {
  const Comp = onClick ? "button" : "div";
  const deltaLabel =
    deltaPct == null || Number.isNaN(deltaPct)
      ? null
      : `${deltaPct > 0 ? "+" : ""}${Math.round(deltaPct * 10) / 10}%`;
  const deltaTone =
    deltaPct == null
      ? null
      : deltaPct > 0
        ? "text-success"
        : deltaPct < 0
          ? "text-danger"
          : "text-text-muted";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "tap rounded-xl border border-border bg-surface p-5 text-left shadow-sm transition",
        onClick &&
          "enabled:hover:border-primary/30 enabled:hover:shadow-md disabled:cursor-default",
        className,
      )}
      aria-label={onClick ? `${label}: ${value}` : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {label}
        </div>
        {deltaLabel ? (
          <span className={cn("text-xs font-semibold tabular-nums", deltaTone)}>
            {deltaLabel}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-text">
        {value}
      </div>
      {detail ? (
        <p className="mt-1 text-sm text-text-muted">{detail}</p>
      ) : null}
    </Comp>
  );
};
