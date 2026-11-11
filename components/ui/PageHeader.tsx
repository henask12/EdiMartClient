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
      "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
      className,
    )}
  >
    <div className="min-w-0 space-y-1">
      <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">
        {title}
      </h1>
      {description ? (
        <p className="text-sm text-text-muted">{description}</p>
      ) : null}
    </div>
    {actions ? (
      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end [&>*]:min-h-11 [&>a]:inline-flex [&>a]:items-center">
        {actions}
      </div>
    ) : null}
  </header>
);
