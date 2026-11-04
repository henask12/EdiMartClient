import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: Props) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center py-16 text-center",
      className,
    )}
  >
    {icon ? (
      <div className="mb-4 text-text-muted/40 [&>svg]:size-12">{icon}</div>
    ) : null}
    <h3 className="text-base font-semibold text-text">{title}</h3>
    {description ? (
      <p className="mt-1.5 max-w-sm text-sm text-text-muted">{description}</p>
    ) : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);
