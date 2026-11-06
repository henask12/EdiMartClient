"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker in production.
 * On localhost, unregisters any existing SW and clears caches so Next.dev
 * chunks are never served stale (that caused the Radix Slot / Button ghost error).
 */
export const ServiceWorkerRegister = () => {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    const run = async () => {
      try {
        if (isLocal) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
          return;
        }
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        /* SW optional */
      }
    };

    void run();
  }, []);

  return null;
};
