"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { buttonVariants } from "./Button";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon: ReactNode;
  title?: string;
};

export const IconButton = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "secondary", icon, className, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(buttonVariants({ variant, size: "icon" }), className)}
      {...rest}
    >
      <span className="[&>svg]:size-4">{icon}</span>
    </button>
  ),
);

IconButton.displayName = "IconButton";
