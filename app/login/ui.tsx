"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Auth");
  const next = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
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
        body: JSON.stringify({
          email,
          password,
          ...(totpRequired && totpCode.trim()
            ? { totpCode: totpCode.trim() }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (data?.code === "TOTP_REQUIRED") {
        setTotpRequired(true);
        setError(null);
        return;
      }

      if (!res.ok) {
        setError(
          typeof data.message === "string" ? data.message : t("loginFailed"),
        );
        return;
      }
      if (data.user?.mustChangePassword) {
        router.replace("/settings/account");
        router.refresh();
        return;
      }
      router.replace(
        next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard",
      );
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10 sm:py-16 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg sm:p-8">
          <div className="flex flex-col items-center text-center">
            <BrandLogo size="lg" />
            <p className="mt-4 text-sm text-text-muted">{t("tagline")}</p>
          </div>

          <h1 className="mt-8 text-center text-xl font-semibold text-text">
            {t("signIn")}
          </h1>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <Input
              type="email"
              label={t("email")}
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={totpRequired}
            />
            <Input
              type="password"
              label={t("password")}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={totpRequired}
            />
            {totpRequired ? (
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                label={t("totpCode")}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                required
                autoFocus
                aria-label={t("totpCode")}
              />
            ) : null}
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            {totpRequired && !error ? (
              <p className="text-sm text-text-muted" role="status">
                {t("totpHint")}
              </p>
            ) : null}
            <Button type="submit" disabled={loading} fullWidth>
              {loading
                ? t("signingIn")
                : totpRequired
                  ? t("verifyTotp")
                  : t("signIn")}
            </Button>
            {totpRequired ? (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => {
                  setTotpRequired(false);
                  setTotpCode("");
                  setError(null);
                }}
              >
                {t("backToLogin")}
              </Button>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
