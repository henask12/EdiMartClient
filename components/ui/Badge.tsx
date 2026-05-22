import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "success" | "warning" | "danger" | "neutral";

type Props = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

const variantClass: Record<Variant, string> = {
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  neutral: "badge-neutral",
};

export const Badge = ({ variant = "neutral", children, className }: Props) => (
  <span className={cn("badge", variantClass[variant], className)}>{children}</span>
);
