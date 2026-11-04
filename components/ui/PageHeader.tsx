import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export const PageHeader = ({ title, description, actions, className }: Props) => (
  <header
    className={cn(
      "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
      className,
    )}
  >
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-text">
        {title}
      </h1>
      {description ? (
        <p className="text-sm text-text-muted">{description}</p>
      ) : null}
    </div>
    {actions ? (
      <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
    ) : null}
  </header>
);
