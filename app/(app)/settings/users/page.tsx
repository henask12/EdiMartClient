"use client";

import { FormEvent, useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  role: { name: string };
};

const ROLES = ["OWNER", "CASHIER", "STORE_STAFF", "ONLINE_MANAGER"] as const;

const ROLE_GUIDE: { role: string; summary: string }[] = [
  {
    role: "OWNER",
    summary: "Full access: users, alert emails, catalog, stock, sales, and settings.",
  },
  {
    role: "STORE_STAFF",
    summary: "Manage products, categories, types, and receive stock. Can sell and reserve.",
  },
  {
    role: "CASHIER",
    summary: "Sell at register and manage reservations. View products only.",
  },
  {
    role: "ONLINE_MANAGER",
    summary: "Reserved for future online channel features.",
  },
];

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("CASHIER");
  const [password, setPassword] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const load = async () => {
    const res = await fetch("/api/proxy/users", { cache: "no-store" });
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    if (res.ok) {
      setUsers((await res.json()) as UserRow[]);
      setForbidden(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
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
    setAddOpen(false);
    await load();
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/proxy/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await load();
  };

  const handleRole = async (id: string, newRole: string) => {
    await fetch(`/api/proxy/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    await load();
  };

  const handleReset = async () => {
    if (!resetId || !resetPassword) return;
    const res = await fetch(`/api/proxy/users/${resetId}/reset-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    if (res.ok) {
      setResetId(null);
      setResetPassword("");
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
      render: (u) => (
        <select
          value={u.role.name}
          onChange={(e) => void handleRole(u.id, e.target.value)}
          className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-xs text-white"
          aria-label={`Role for ${u.email}`}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
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
          <button
            type="button"
            onClick={() => void handleToggle(u.id, u.isActive)}
            className="tap rounded-lg border border-white/15 px-2 py-1 text-xs text-white/80"
          >
            {u.isActive ? "Deactivate" : "Activate"}
          </button>
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
          Only the <strong className="text-white">OWNER</strong> role can manage users. Log in as
          the shop owner or ask them to change your role.
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

      <section className="rounded-2xl border border-white/10 bg-[color:var(--surface)]/60 p-5">
        <h2 className="text-sm font-semibold text-white/80">Role guide</h2>
        <ul className="mt-3 space-y-2">
          {ROLE_GUIDE.map((g) => (
            <li key={g.role} className="text-sm">
              <span className="font-semibold text-[var(--accent-2)]">{g.role}</span>
              <span className="text-white/60"> — {g.summary}</span>
            </li>
          ))}
        </ul>
      </section>

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
              <select
                value={u.role.name}
                onChange={(e) => void handleRole(u.id, e.target.value)}
                className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-xs text-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleToggle(u.id, u.isActive)}
                className="tap rounded-lg border border-white/15 px-2 py-1 text-xs"
              >
                {u.isActive ? "Deactivate" : "Activate"}
              </button>
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
                onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
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
