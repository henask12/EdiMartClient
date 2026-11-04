"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

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
      setError(
        typeof data.message === "string" ? data.message : "Could not add",
      );
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
    await fetch(`/api/proxy/settings/notification-emails/${id}`, {
      method: "DELETE",
    });
    await load();
  };

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader
        title="Alert emails"
        description="Low-stock and expiry alerts via Resend (set API key in .env)."
      />

      <form
        onSubmit={handleAdd}
        className="flex gap-2 rounded-xl border border-border bg-surface p-4"
      >
        <Input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          containerClassName="flex-1"
        />
        <div className="flex items-end">
          <Button type="submit" size="sm">
            Add
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <ul className="space-y-2">
        {items.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between rounded-xl border border-border bg-surface-muted px-4 py-3"
          >
            <span
              className={
                row.active ? "text-text" : "text-text-muted line-through"
              }
            >
              {row.email}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleToggle(row.id, !row.active)}
                className="text-xs font-semibold text-primary"
              >
                {row.active ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(row.id)}
                className="text-xs font-semibold text-danger"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="text-sm text-text-muted">No emails configured.</li>
        ) : null}
      </ul>
    </div>
  );
}
