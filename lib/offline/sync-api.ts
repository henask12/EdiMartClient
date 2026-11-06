/** Thin client for Phase 9 sync-conflict API — degrades when routes are missing. */

export type SyncConflict = {
  id: string;
  kind?: string;
  status?: string;
  message?: string;
  detail?: unknown;
  createdAt?: string;
  clientId?: string;
};

export const listRemoteConflicts = async (): Promise<SyncConflict[]> => {
  try {
    const res = await fetch("/api/proxy/sync/conflicts", { cache: "no-store" });
    if (res.status === 404) return [];
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    if (Array.isArray(data)) return data as SyncConflict[];
    if (data && Array.isArray((data as { items?: unknown }).items)) {
      return (data as { items: SyncConflict[] }).items;
    }
    return [];
  } catch {
    return [];
  }
};

export const resolveRemoteConflict = async (
  id: string,
  resolution: "dismiss" | "retry" | "accept_server" | "accept_client",
): Promise<{ ok: boolean; missing?: boolean; message?: string }> => {
  try {
    const res = await fetch(`/api/proxy/sync/conflicts/${id}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resolution }),
    });
    if (res.status === 404) {
      const alt = await fetch(`/api/proxy/sync/conflicts/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resolution }),
      });
      if (alt.status === 404) return { ok: false, missing: true };
      if (!alt.ok) {
        const data = await alt.json().catch(() => ({}));
        return {
          ok: false,
          message:
            typeof (data as { message?: string }).message === "string"
              ? (data as { message: string }).message
              : `HTTP ${alt.status}`,
        };
      }
      return { ok: true };
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        message:
          typeof (data as { message?: string }).message === "string"
            ? (data as { message: string }).message
            : `HTTP ${res.status}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Network error",
    };
  }
};
