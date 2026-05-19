"use client";

import { FormEvent, useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  role: { name: string };
};

const ROLES = ["OWNER", "CASHIER", "STORE_STAFF", "ONLINE_MANAGER"] as const;

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("CASHIER");
  const [password, setPassword] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const load = async () => {
    const res = await fetch("/api/proxy/users", { cache: "no-store" });
    if (res.ok) setUsers((await res.json()) as UserRow[]);
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

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">User management</h1>
        <p className="mt-2 text-sm text-white/60">Owner only — staff accounts and roles.</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-3 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-5">
        <h2 className="text-sm font-semibold text-white/80">Add user</h2>
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
        <button type="submit" className="btn-primary w-full py-2 text-sm">
          Create user
        </button>
      </form>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <ul className="space-y-3">
        {users.map((u) => (
          <li
            key={u.id}
            className="rounded-xl border border-white/10 bg-[color:var(--surface)]/70 p-4 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white">{u.displayName ?? u.email}</p>
                <p className="text-xs text-white/50">{u.email}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  u.isActive ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/40"
                }`}
              >
                {u.isActive ? "Active" : "Inactive"}
              </span>
            </div>
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
                className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/80"
              >
                {u.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                onClick={() => setResetId(u.id)}
                className="rounded-lg border border-white/15 px-3 py-1 text-xs text-[var(--accent-2)]"
              >
                Reset password
              </button>
            </div>
          </li>
        ))}
      </ul>

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
