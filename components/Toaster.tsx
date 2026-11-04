"use client";

import { Toaster as Sonner } from "sonner";

export const Toaster = () => (
  <Sonner
    position="top-center"
    richColors
    closeButton
    toastOptions={{
      classNames: {
        toast: "border border-border bg-surface text-text shadow-lg",
        title: "text-text",
        description: "text-text-muted",
        success: "border-success/30",
        error: "border-danger/40",
      },
    }}
  />
);
