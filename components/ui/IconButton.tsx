"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "secondary" | "ghost" | "danger" | "primary";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  variant?: Variant;
  icon: ReactNode;
  title?: string;
};

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export const IconButton = ({
  variant = "secondary",
  icon,
  className,
  title,
  ...rest
}: Props) => (
  <button
    type="button"
    title={title}
    className={cn("btn-icon", variantClass[variant], className)}
    {...rest}
  >
    <span className="[&>svg]:size-4">{icon}</span>
  </button>
);
