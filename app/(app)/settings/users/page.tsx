"use client";

import { FormEvent, useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { isOwnerRole } from "@/lib/permissions";

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  role: { name: string };
};

type RoleOption = { id: string; name: string; isProtected: boolean };

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("CASHIER");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const assignableRoles = roles.filter((r) => !r.isProtected && !isOwnerRole(r.name));

  const load = async () => {
    const params = new URLSearchParams({
      skip: String((page - 1) * pageSize),
      take: String(pageSize),
    });
    const res = await fetch(`/api/proxy/users?${params}`, { cache: "no-store" });
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) {
      const data = (await res.json()) as { items: UserRow[]; total: number };
      setUsers(data.items);
      setTotal(data.total);
      setForbidden(false);
    }
  };

  useEffect(() => {
    void fetch("/api/proxy/roles", { cache: "no-store" }).then(async (res) => {
      if (res.ok) {
        const data = (await res.json()) as RoleOption[];
        setRoles(data);
        const first = data.find((r) => !r.isProtected && r.name !== "OWNER");
        if (first) setRole(first.name);
      }
    });
  }, []);

  useEffect(() => {
    void load();
  }, [page, pageSize]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const res = await fetch("/api/proxy/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, displayName, role, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Could not create user");
      return;
    }
    setEmail("");
    setDisplayName("");
    setPassword("");
    setConfirmPassword("");
    setAddOpen(false);
    await load();
  };

  const handleToggle = async (id: string, isActive: boolean, userRole: string) => {
    if (isOwnerRole(userRole) && isActive) {
      setError("Owner accounts cannot be deactivated");
      return;
    }
    await fetch(`/api/proxy/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await load();
  };

  const handleRole = async (id: string, newRole: string, currentRole: string) => {
    if (isOwnerRole(currentRole)) {
      setError("Owner role cannot be changed");
      return;
    }
    const res = await fetch(`/api/proxy/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.message === "string" ? data.message : "Could not update role");
      return;
    }
    await load();
  };

  const handleReset = async () => {
    if (!resetId || !resetPassword) return;
    setError(null);
    if (resetPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const res = await fetch(`/api/proxy/users/${resetId}/reset-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    if (res.ok) {
      setResetId(null);
      setResetPassword("");
      setResetConfirmPassword("");
    } else {
      setError("Reset failed");
    }
  };

  const columns: DataTableColumn<UserRow>[] = [
    {
      key: "email",
      header: "Email",
      render: (u) => (
        <div>
          <p className="font-medium text-white">{u.displayName ?? u.email}</p>
          <p className="text-xs text-white/45">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) =>
        isOwnerRole(u.role.name) ? (
          <span className="text-xs font-semibold text-[var(--accent-2)]">OWNER</span>
        ) : (
          <select
            value={u.role.name}
            onChange={(e) => void handleRole(u.id, e.target.value, u.role.name)}
            className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-xs text-white"
            aria-label={`Role for ${u.email}`}
          >
            {assignableRoles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            u.isActive ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/40"
          }`}
        >
          {u.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (u) => (
        <div className="flex flex-wrap justify-end gap-2">
          {!isOwnerRole(u.role.name) ? (
            <button
              type="button"
              onClick={() => void handleToggle(u.id, u.isActive, u.role.name)}
              className="tap rounded-lg border border-white/15 px-2 py-1 text-xs text-white/80"
            >
              {u.isActive ? "Deactivate" : "Activate"}
            </button>
          ) : (
            <span className="text-[10px] text-white/40">Protected</span>
          )}
          <button
            type="button"
            onClick={() => setResetId(u.id)}
            className="tap rounded-lg border border-white/15 px-2 py-1 text-xs text-[var(--accent-2)]"
          >
            Reset password
          </button>
        </div>
      ),
    },
  ];

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-white">User management</h1>
        <p className="text-sm text-white/60">
          You need the <strong className="text-white">Manage users</strong> permission. Ask the shop
          owner to grant it to your role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">User management</h1>
          <p className="mt-2 text-sm text-white/60">
            Create accounts and assign roles for your team.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="tap btn-primary px-5 py-2.5 text-sm"
        >
          Add user
        </button>
      </div>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <DataTable
        columns={columns}
        rows={users}
        rowKey={(u) => u.id}
        emptyMessage="No users yet. Add your first team member."
        mobileCard={(u) => (
          <div className="rounded-xl border border-white/10 bg-[color:var(--surface)]/70 p-4 text-sm">
            <p className="font-medium text-white">{u.displayName ?? u.email}</p>
            <p className="text-xs text-white/50">{u.email}</p>
            <p className="mt-2 text-xs text-white/60">
              {u.role.name} · {u.isActive ? "Active" : "Inactive"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {isOwnerRole(u.role.name) ? (
                <span className="text-xs text-[var(--accent-2)]">OWNER (protected)</span>
              ) : (
                <select
                  value={u.role.name}
                  onChange={(e) => void handleRole(u.id, e.target.value, u.role.name)}
                  className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-xs text-white"
                >
                  {assignableRoles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
              {!isOwnerRole(u.role.name) ? (
                <button
                  type="button"
                  onClick={() => void handleToggle(u.id, u.isActive, u.role.name)}
                  className="tap rounded-lg border border-white/15 px-2 py-1 text-xs"
                >
                  {u.isActive ? "Deactivate" : "Activate"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setResetId(u.id)}
                className="tap text-xs text-[var(--accent-2)]"
              >
                Reset password
              </button>
            </div>
          </div>
        )}
      />

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <PageSizeSelect
          value={pageSize}
          options={[10, 15, 25, 50]}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[color:var(--surface)] p-5">
            <h2 className="text-lg font-semibold text-white">Add user</h2>
            <form onSubmit={(e) => void handleCreate(e)} className="space-y-3">
              <input
                required
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
              <input
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              >
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
              <input
                required
                type="password"
                placeholder="Temporary password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
                minLength={8}
                autoComplete="new-password"
              />
              <input
                required
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
                minLength={8}
                autoComplete="new-password"
              />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2 text-sm">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="flex-1 rounded-full border border-white/15 py-2 text-sm text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {resetId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-[color:var(--surface)] p-5">
            <h3 className="font-semibold text-white">Reset password</h3>
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              minLength={8}
              autoComplete="new-password"
            />
            <input
              type="password"
              value={resetConfirmPassword}
              onChange={(e) => setResetConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              minLength={8}
              autoComplete="new-password"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleReset()} className="btn-primary flex-1 py-2 text-sm">
                Save
              </button>
              <button
                type="button"
                onClick={() => setResetId(null)}
                className="flex-1 rounded-full border border-white/15 py-2 text-sm text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
