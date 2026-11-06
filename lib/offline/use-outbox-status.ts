"use client";

import { useCallback, useEffect, useState } from "react";
import {
  OUTBOX_CHANGED_EVENT,
  countNeedsAttention,
  countPendingSales,
  flushOutbox,
  listOutbox,
  type OutboxItem,
} from "@/lib/offline/outbox";

export type OutboxStatusState = {
  online: boolean;
  pendingSales: number;
  needsAttention: number;
  items: OutboxItem[];
  syncing: boolean;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
};

export const useOutboxStatus = (): OutboxStatusState => {
  const [online, setOnline] = useState(true);
  const [pendingSales, setPendingSales] = useState(0);
  const [needsAttention, setNeedsAttention] = useState(0);
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const [sales, attention, rows] = await Promise.all([
      countPendingSales(),
      countNeedsAttention(),
      listOutbox(),
    ]);
    setPendingSales(sales);
    setNeedsAttention(attention);
    setItems(rows);
  }, []);

  const syncNow = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setSyncing(true);
    try {
      await flushOutbox();
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      void syncNow();
    };
    const off = () => setOnline(false);
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const onChange = () => void refresh();
    window.addEventListener(OUTBOX_CHANGED_EVENT, onChange);
    void refresh();
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void syncNow();
    }
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener(OUTBOX_CHANGED_EVENT, onChange);
    };
  }, [refresh, syncNow]);

  return {
    online,
    pendingSales,
    needsAttention,
    items,
    syncing,
    refresh,
    syncNow,
  };
};
