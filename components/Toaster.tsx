"use client";

import { Toaster as Sonner } from "sonner";

export const Toaster = () => (
  <Sonner
    position="top-center"
    richColors
    closeButton
    toastOptions={{
      classNames: {
        toast: "border border-white/10 bg-[color:var(--surface)] text-white shadow-lg",
        title: "text-white",
        description: "text-white/70",
        success: "border-[var(--brand-yellow)]/30",
        error: "border-rose-500/40",
      },
    }}
  />
);
