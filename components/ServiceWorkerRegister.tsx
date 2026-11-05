"use client";

import { useEffect } from "react";

/** Registers the lightweight PWA service worker once on the client. */
export const ServiceWorkerRegister = () => {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        /* SW optional — ignore registration failures (private mode, etc.) */
      }
    };
    void register();
  }, []);

  return null;
};
