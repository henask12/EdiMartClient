"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { isOwnerRole, type Permission } from "@/lib/permissions";

export type RoleRow = {
  id: string;
  name: string;
  isProtected: boolean;
  permissions: string[];
  userCount?: number;
};

type CatalogEntry = {
  key: Permission;
  label: string;
  group: string;
  description: string;
  sensitive: boolean;
  status: "active" | "planned";
  deprecated?: boolean;
};

type Catalog = { groups: string[]; permissions: CatalogEntry[] };

type Props = {
  roles: RoleRow[];
  /** Called after changes were saved, so the page can reload its roles. */
  onSaved: () => void | Promise<void>;
  /** Highlight one role's column (e.g. the role selected below). */
  focusRoleId?: string | null;
};

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));

/**
 * The roles screen as a grid: one row per permission (grouped by area, with a one-line
 * description), one column per role. Sensitive permissions are flagged. Nothing is saved until
 * "Save changes"; the owner column is locked because the owner can always do everything.
 */
export const PermissionMatrix = ({ roles, onSaved, focusRoleId }: Props) => {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Set<string>>>({});
  const [showPlanned, setShowPlanned] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/proxy/roles/permissions", { cache: "no-store" });
      if (!res.ok) {
        setLoadError("Could not load the list of permissions.");
        return;
      }
      setCatalog((await res.json()) as Catalog);
    })();
  }, []);

  const baseline = useMemo(
    () => Object.fromEntries(roles.map((r) => [r.id, new Set(r.permissions)])) as Record<string, Set<string>>,
    [roles],
  );

  // Keep unsaved edits when the role list reloads; fresh roles start from what is stored.
  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, Set<string>> = {};
      for (const role of roles) {
        const old = prev[role.id];
        next[role.id] = old && !sameSet(old, baseline[role.id]) ? old : new Set(role.permissions);
      }
      return next;
    });
  }, [roles, baseline]);

  const changes = useMemo(
    () =>
      roles
        .filter((r) => !r.isProtected && !isOwnerRole(r.name) && drafts[r.id])
        .map((r) => {
          const now = drafts[r.id];
          const was = baseline[r.id];
          return {
            role: r,
            added: [...now].filter((k) => !was.has(k)),
            removed: [...was].filter((k) => !now.has(k)),
          };
        })
        .filter((c) => c.added.length + c.removed.length > 0),
    [roles, drafts, baseline],
  );

  const byKey = useMemo(() => new Map((catalog?.permissions ?? []).map((p) => [p.key as string, p])), [catalog]);

  const toggle = useCallback((roleId: string, key: string) => {
    setSavedAt(null);
    setDrafts((prev) => {
      const next = new Set(prev[roleId]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [roleId]: next };
    });
  }, []);

  const discard = () => {
    setDrafts(Object.fromEntries(roles.map((r) => [r.id, new Set(r.permissions)])));
    setErrors({});
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    const failed: Record<string, string> = {};
    for (const change of changes) {
      const res = await fetch(`/api/proxy/roles/${change.role.id}/permissions`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permissions: [...drafts[change.role.id]] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        failed[change.role.id] =
          typeof data.message === "string" ? data.message : "Could not save this role";
      }
    }
    setErrors(failed);
    setSaving(false);
    if (Object.keys(failed).length === 0) setSavedAt(Date.now());
    await onSaved();
  };

  if (loadError) {
    return <p className="text-sm text-rose-200">{loadError}</p>;
  }
  if (!catalog) {
    return <p className="text-sm text-white/60">Loading permissions…</p>;
  }

  const visible = (p: CatalogEntry) => (p.deprecated ? showOld : p.status === "planned" ? showPlanned : true);
  const sensitiveGrants = changes.flatMap((c) =>
    c.added
      .map((k) => byKey.get(k))
      .filter((p): p is CatalogEntry => Boolean(p?.sensitive))
      .map((p) => `${c.role.name}: ${p.label}`),
  );

  return (
    <section className="section-card space-y-4" aria-labelledby="matrix-title">
      <div>
        <h2 id="matrix-title" className="text-lg font-semibold text-white">
          What each role can do
        </h2>
        <p className="mt-1 text-sm text-white/55">
          Tick what a role may do. The owner can always do everything. Items marked{" "}
          <span className="font-semibold text-amber-200">Sensitive</span> involve money, stock corrections or who can
          do what, so switch them on with care.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showPlanned} onChange={(e) => setShowPlanned(e.target.checked)} />
            Show features that are not used yet
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showOld} onChange={(e) => setShowOld(e.target.checked)} />
            Show old permissions that no longer do anything
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="bg-black/30 text-left">
              <th scope="col" className="sticky left-0 z-10 min-w-[16rem] bg-[color:var(--surface)] px-3 py-3 font-semibold text-white/70">
                Permission
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  scope="col"
                  className={`px-3 py-3 text-center font-semibold ${
                    focusRoleId === role.id ? "text-[var(--accent)]" : "text-white/80"
                  }`}
                >
                  <span className="block">{role.name}</span>
                  {role.isProtected || isOwnerRole(role.name) ? (
                    <span className="block text-[10px] font-normal text-white/40">always everything</span>
                  ) : (
                    <span className="block text-[10px] font-normal text-white/40">{role.userCount ?? 0} users</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.groups.map((group) => {
              const rows = catalog.permissions.filter((p) => p.group === group && visible(p));
              if (rows.length === 0) return null;
              return (
                <Fragment key={group}>
                  <tr className="bg-white/5">
                    <th
                      scope="colgroup"
                      colSpan={roles.length + 1}
                      className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-white/55"
                    >
                      {group}
                    </th>
                  </tr>
                  {rows.map((p) => (
                    <tr key={p.key} className={`border-t border-white/5 ${p.status === "planned" ? "opacity-70" : ""}`}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-[color:var(--surface)] px-3 py-2 text-left align-top font-normal"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-white">{p.label}</span>
                          {p.sensitive ? <Badge variant="warning">Sensitive</Badge> : null}
                          {p.status === "planned" ? <Badge variant="neutral">Not used yet</Badge> : null}
                          {p.deprecated ? <Badge variant="neutral">Old</Badge> : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-white/50">{p.description}</span>
                      </th>
                      {roles.map((role) => {
                        const locked = role.isProtected || isOwnerRole(role.name);
                        const checked = locked || drafts[role.id]?.has(p.key) || false;
                        return (
                          <td key={role.id} className="px-3 py-2 text-center align-middle">
                            <input
                              type="checkbox"
                              className="size-5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                              checked={checked}
                              disabled={locked}
                              aria-label={`${role.name}: ${p.label}`}
                              onChange={() => toggle(role.id, p.key)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {Object.entries(errors).map(([roleId, message]) => (
        <p key={roleId} className="text-sm text-rose-200" role="alert">
          {roles.find((r) => r.id === roleId)?.name}: {message}
        </p>
      ))}
      {savedAt && changes.length === 0 ? (
        <p className="text-sm text-emerald-200" role="status">
          Saved.
        </p>
      ) : null}

      {changes.length > 0 ? (
        <div className="sticky bottom-20 z-20 space-y-3 rounded-xl border border-[var(--accent)]/40 bg-[color:var(--surface)] p-4 shadow-xl lg:bottom-4">
          <p className="text-sm text-white">
            Unsaved changes:{" "}
            {changes.map((c) => `${c.role.name} (+${c.added.length} / −${c.removed.length})`).join(", ")}
          </p>
          {sensitiveGrants.length > 0 ? (
            <p className="text-sm text-amber-200" role="status">
              You are switching on sensitive permissions: {sensitiveGrants.join("; ")}.
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="secondary" onClick={discard} disabled={saving}>
              Discard
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
};
