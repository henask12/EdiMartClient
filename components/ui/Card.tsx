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
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export const StatCard = ({
  label,
  value,
  detail,
  className,
  onClick,
  disabled,
}: StatCardProps) => {
  const Comp = onClick ? "button" : "div";
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
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
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
