"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("owner@edisims.local");
  const [password, setPassword] = useState("Owner123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Login failed");
        return;
      }
      router.replace(next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="card-surface border-[var(--brand-yellow)]/25 p-8 shadow-[0_30px_120px_-50px_oklch(0.2_0.02_260_/_0.95)]">
        <div className="flex flex-col items-center text-center">
          <BrandLogo size="lg" variant="on-dark" />
          <p className="mt-4 text-sm text-white/55">Inventory &amp; sales for your mart</p>
        </div>
        <h1 className="mt-8 text-center text-xl font-semibold text-white">Sign in</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-white/70">
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/35"
              required
            />
          </label>
          <label className="block text-sm text-white/70">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/35"
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-rose-200" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={loading} className="tap btn-primary w-full px-4 py-3 text-sm">
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
