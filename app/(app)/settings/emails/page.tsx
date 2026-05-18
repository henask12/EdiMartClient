"use client";

import { FormEvent, useEffect, useState } from "react";

type NotificationEmail = {
  id: string;
  email: string;
  active: boolean;
};

export default function NotificationEmailsPage() {
  const [items, setItems] = useState<NotificationEmail[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/proxy/settings/notification-emails", {
      cache: "no-store",
    });
    if (res.ok) {
      setItems((await res.json()) as NotificationEmail[]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/proxy/settings/notification-emails", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Could not add");
      return;
    }
    setEmail("");
    await load();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch(`/api/proxy/settings/notification-emails/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active }),
    });
    await load();
  };

  const handleRemove = async (id: string) => {
    await fetch(`/api/proxy/settings/notification-emails/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Alert emails</h1>
        <p className="mt-2 text-sm text-white/60">
          Low-stock and expiry alerts via Resend (set API key in .env).
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="flex gap-2 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-4"
      >
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <button
          type="submit"
          className="tap btn-primary px-4 py-2 text-sm"
        >
          Add
        </button>
      </form>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <ul className="space-y-2">
        {items.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
          >
            <span className={row.active ? "text-white" : "text-white/40 line-through"}>
              {row.email}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleToggle(row.id, !row.active)}
                className="text-xs font-semibold text-[var(--accent-2)]"
              >
                {row.active ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(row.id)}
                className="text-xs font-semibold text-rose-300"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="text-sm text-white/50">No emails configured.</li>
        ) : null}
      </ul>
    </div>
  );
}
