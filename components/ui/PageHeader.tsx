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
    <div className="page-header">
      <h1 className="page-title">{title}</h1>
      {description ? <p className="page-subtitle">{description}</p> : null}
    </div>
    {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
  </header>
);
