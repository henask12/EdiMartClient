import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
  {
    variants: {
      variant: {
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        info: "bg-info-soft text-info",
        neutral: "bg-surface-muted text-text-muted",
        accent: "bg-accent/15 text-accent",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

type Props = VariantProps<typeof badgeVariants> & {
  children: ReactNode;
  className?: string;
};

export const Badge = ({ variant, children, className }: Props) => (
  <span className={cn(badgeVariants({ variant }), className)}>{children}</span>
);
