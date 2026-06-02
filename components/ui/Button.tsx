"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
};

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export const Button = ({
  variant = "primary",
  size = "md",
  icon,
  fullWidth,
  className,
  children,
  type = "button",
  ...rest
}: Props) => (
  <button
    type={type}
    className={cn(
      "btn",
      size === "sm" && "btn-sm",
      variantClass[variant],
      fullWidth && "w-full",
      className,
    )}
    {...rest}
  >
    {icon ? <span className="shrink-0 [&>svg]:size-4">{icon}</span> : null}
    {children}
  </button>
);
