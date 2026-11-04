"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary-hover",
        secondary:
          "border border-border-strong bg-surface text-text hover:bg-surface-muted",
        ghost: "text-text-muted hover:bg-surface-muted hover:text-text",
        danger: "bg-danger-soft text-danger border border-danger/20 hover:bg-danger/10",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        pos: "h-14 px-6 text-base min-w-14",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    icon?: ReactNode;
    fullWidth?: boolean;
    asChild?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      size,
      icon,
      fullWidth,
      asChild = false,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
          className,
        )}
        {...rest}
      >
        {icon ? <span className="shrink-0 [&>svg]:size-4">{icon}</span> : null}
        {children}
      </Comp>
    );
  },
);

Button.displayName = "Button";

export { buttonVariants };
