import { cn } from "@/lib/cn";

type Props = {
  children: string;
  className?: string;
};

export const Kbd = ({ children, className }: Props) => (
  <kbd
    className={cn(
      "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-muted px-1.5 text-[10px] font-medium text-text-muted",
      className,
    )}
  >
    {children}
  </kbd>
);
