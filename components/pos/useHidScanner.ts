"use client";

import { useEffect, useRef } from "react";

type Options = {
  enabled?: boolean;
  /** Max gap between keystrokes (ms) to treat as a scanner burst. */
  gapMs?: number;
  minLength?: number;
  onScan: (code: string) => void;
};

/**
 * Global HID barcode listener: fast character bursts ending in Enter add a product
 * even when the search input is not focused. Ignores typing inside textareas and
 * slow human typing in inputs (except when the event looks like a burst).
 */
export const useHidScanner = ({
  enabled = true,
  gapMs = 50,
  minLength = 3,
  onScan,
}: Options) => {
  const buffer = useRef("");
  const lastAt = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      buffer.current = "";
      lastAt.current = 0;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === "textarea" ||
        target?.isContentEditable ||
        (tag === "input" &&
          (target as HTMLInputElement).type !== "search" &&
          (target as HTMLInputElement).type !== "text" &&
          (target as HTMLInputElement).type !== "");

      // Allow bursts in search/text inputs; block password/number/etc.
      if (isEditable && tag !== "input") return;
      if (tag === "input") {
        const type = (target as HTMLInputElement).type;
        if (type === "password" || type === "number" || type === "email") return;
      }

      const now = Date.now();
      if (lastAt.current && now - lastAt.current > gapMs * 4) {
        buffer.current = "";
      }

      if (e.key === "Enter") {
        const code = buffer.current.trim();
        const wasBurst = buffer.current.length >= minLength && lastAt.current > 0;
        reset();
        if (wasBurst && code) {
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(code);
        }
        return;
      }

      if (e.key.length === 1) {
        const gap = lastAt.current ? now - lastAt.current : 0;
        if (lastAt.current && gap > gapMs * 3) {
          buffer.current = e.key;
        } else {
          buffer.current += e.key;
        }
        lastAt.current = now;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [enabled, gapMs, minLength]);
};
