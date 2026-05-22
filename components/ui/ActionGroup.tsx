import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
};

export const ActionGroup = ({ children, className }: Props) => (
  <div className={cn("flex items-center justify-end gap-1", className)}>{children}</div>
);
