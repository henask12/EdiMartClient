"use client";

import { useCallback, useEffect, useState } from "react";
import { ALL_PERMISSIONS, PERMISSION_LABELS, type Permission } from "@/lib/permissions";

export type RoleRow = {
  id: string;
  name: string;
  isProtected: boolean;
  permissions: string[];
  userCount?: number;
};

type Props = {
  /** When set, only edit this role (no role picker). */
  roleId?: string | null;
  /** Hide the section heading (e.g. when embedded in roles page). */
  compact?: boolean;
};

export const RolePermissionsEditor = ({ roleId: controlledRoleId, compact }: Props) => {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Set<Permission>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const activeRoleId = controlledRoleId ?? selectedId;

  const load = useCallback(async () => {
    const res = await fetch("/api/proxy/roles", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as RoleRow[];
    setRoles(data);
    if (!controlledRoleId && !selectedId && data[0]) {
      setSelectedId(data[0].id);
    }
  }, [controlledRoleId, selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const role = roles.find((r) => r.id === activeRoleId);
    if (role) {
      setDraft(new Set(role.permissions as Permission[]));
      setSaved(false);
    }
  }, [activeRoleId, roles]);

  const selectedRole = roles.find((r) => r.id === activeRoleId);
  const isProtected = selectedRole?.isProtected ?? selectedRole?.name === "OWNER";

  const handleToggle = (key: Permission) => {
    if (isProtected) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (isProtected || !activeRoleId) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/proxy/roles/${activeRoleId}/permissions`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permissions: [...draft] }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.message === "string" ? data.message : "Could not save permissions");
      return;
    }
    setSaved(true);
    await load();
  };

  if (roles.length === 0) {
    return null;
  }

  const content = (
    <>
      {!compact ? (
        <>
          <h2 className="text-sm font-semibold text-white/80">Role permissions</h2>
          <p className="mt-1 text-xs text-white/50">
            Choose what each role can do. The owner role always has full access and cannot be changed.
          </p>
        </>
      ) : null}

      {!controlledRoleId ? (
        <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-4"}`}>
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={`tap rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeRoleId === r.id
                  ? "bg-[var(--brand-yellow)]/20 text-[var(--accent)]"
                  : "border border-white/15 text-white/70"
              }`}
            >
              {r.name}
              {r.isProtected ? " (protected)" : ""}
            </button>
          ))}
        </div>
      ) : null}

      {isProtected ? (
        <p className="mt-4 text-xs text-white/50">
          Owner has all permissions and cannot be edited or removed from the system.
        </p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {ALL_PERMISSIONS.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={draft.has(key)}
                onChange={() => handleToggle(key)}
                className="mt-0.5"
              />
              <span className="text-white/85">{PERMISSION_LABELS[key]}</span>
            </label>
          ))}
        </div>
      )}

      {error ? <p className="mt-3 text-xs text-rose-200">{error}</p> : null}
      {saved ? <p className="mt-3 text-xs text-emerald-200">Permissions saved.</p> : null}

      {!isProtected ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="tap btn-primary mt-4 px-5 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : `Save ${selectedRole?.name ?? "role"} permissions`}
        </button>
      ) : null}
    </>
  );

  if (compact) {
    return <div>{content}</div>;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[color:var(--surface)]/60 p-5">
      {content}
    </section>
  );
};
