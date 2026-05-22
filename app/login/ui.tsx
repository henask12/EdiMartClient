"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
          <Input
            type="email"
            label="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            required
          />
          <Input
            type="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            required
          />
          {error ? (
            <p className="text-sm text-rose-200" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={loading} fullWidth>
            {loading ? "Signing in…" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
