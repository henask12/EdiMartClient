import { cn } from "@/lib/cn";

type Props = {
  className?: string;
};

export const Skeleton = ({ className }: Props) => (
  <div
    className={cn(
      "animate-pulse rounded-lg bg-surface-muted",
      className,
    )}
  />
);

export const SkeletonText = ({ className }: Props) => (
  <div className={cn("space-y-2", className)}>
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export const SkeletonCard = ({ className }: Props) => (
  <div
    className={cn(
      "rounded-xl border border-border bg-surface p-5 shadow-sm",
      className,
    )}
  >
    <Skeleton className="mb-3 h-3 w-20" />
    <Skeleton className="mb-2 h-7 w-28" />
    <Skeleton className="h-4 w-16" />
  </div>
);
