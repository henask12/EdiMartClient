"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { toastError, toastSuccess } from "@/lib/toast";

type SessionRow = {
  id: string;
  createdAt?: string;
  lastSeenAt?: string;
  userAgent?: string | null;
  ip?: string | null;
  current?: boolean;
};

type TotpSetup = {
  secret?: string;
  otpauthUrl?: string;
  qrUrl?: string;
};

export default function SecuritySettingsPage() {
  const t = useTranslations("Security");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsMissing, setSessionsMissing] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy/auth/sessions", { cache: "no-store" });
      if (res.status === 404) {
        setSessionsMissing(true);
        setSessions([]);
        return;
      }
      if (!res.ok) {
        setSessions([]);
        return;
      }
      const data = await res.json().catch(() => null);
      const rows = Array.isArray(data)
        ? data
        : Array.isArray((data as { items?: unknown })?.items)
          ? (data as { items: SessionRow[] }).items
          : [];
      setSessions(rows);
      setSessionsMissing(false);
    } catch {
      setSessions([]);
    }
  }, []);

  const loadTotpStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy/auth/me", { cache: "no-store" });
      if (!res.ok) return;
      const me = (await res.json()) as { totpEnabled?: boolean; hasTotp?: boolean };
      setTotpEnabled(Boolean(me.totpEnabled ?? me.hasTotp));
    } catch {
      setTotpEnabled(null);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    void loadTotpStatus();
  }, [loadSessions, loadTotpStatus]);

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/proxy/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(
          typeof data.message === "string" ? data.message : t("passwordFailed"),
        );
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      toastSuccess(t("passwordUpdated"));
    } finally {
      setBusy(false);
    }
  };

  const handleStartTotp = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/proxy/auth/totp/setup", { method: "POST" });
      if (res.status === 404) {
        toastError(t("totpUnavailable"));
        return;
      }
      const data = (await res.json().catch(() => ({}))) as TotpSetup & {
        message?: string;
      };
      if (!res.ok) {
        toastError(data.message ?? t("totpSetupFailed"));
        return;
      }
      setSetup(data);
    } finally {
      setBusy(false);
    }
  };

  const handleEnableTotp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/proxy/auth/totp/enable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });
      if (res.status === 404) {
        toastError(t("totpUnavailable"));
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(
          typeof data.message === "string" ? data.message : t("totpEnableFailed"),
        );
        return;
      }
      setTotpEnabled(true);
      setSetup(null);
      setTotpCode("");
      toastSuccess(t("totpEnabled"));
    } finally {
      setBusy(false);
    }
  };

  const handleDisableTotp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/proxy/auth/totp/disable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password: disablePassword,
          code: totpCode || undefined,
        }),
      });
      if (res.status === 404) {
        toastError(t("totpUnavailable"));
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(
          typeof data.message === "string" ? data.message : t("totpDisableFailed"),
        );
        return;
      }
      setTotpEnabled(false);
      setDisablePassword("");
      setTotpCode("");
      toastSuccess(t("totpDisabled"));
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setBusy(true);
    try {
      let res = await fetch(`/api/proxy/auth/sessions/${id}`, {
        method: "DELETE",
      });
      if (res.status === 404) {
        res = await fetch(`/api/proxy/auth/sessions/${id}/revoke`, {
          method: "POST",
        });
      }
      if (res.status === 404) {
        toastError(t("sessionsUnavailable"));
        return;
      }
      if (!res.ok) {
        toastError(t("revokeFailed"));
        return;
      }
      toastSuccess(t("revoked"));
      await loadSessions();
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeOthers = async () => {
    setBusy(true);
    try {
      let res = await fetch("/api/proxy/auth/sessions/revoke-others", {
        method: "POST",
      });
      if (res.status === 404) {
        res = await fetch("/api/proxy/auth/logout-all", { method: "POST" });
      }
      if (res.status === 404) {
        toastError(t("sessionsUnavailable"));
        return;
      }
      if (!res.ok) {
        toastError(t("revokeFailed"));
        return;
      }
      toastSuccess(t("revokedOthers"));
      await loadSessions();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <PageHeader title={t("title")} description={t("description")} />

      <Card>
        <form onSubmit={handlePassword} className="space-y-4">
          <h2 className="text-sm font-semibold text-text">{t("changePassword")}</h2>
          <Input
            type="password"
            required
            label={t("currentPassword")}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            type="password"
            required
            minLength={8}
            label={t("newPassword")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Button type="submit" variant="secondary" disabled={busy} fullWidth>
            {t("updatePassword")}
          </Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-text">{t("totpTitle")}</h2>
        <p className="text-xs text-text-muted">
          {totpEnabled ? t("totpOn") : t("totpOff")}
        </p>
        {!totpEnabled ? (
          <>
            {!setup ? (
              <Button
                type="button"
                onClick={() => void handleStartTotp()}
                disabled={busy}
                fullWidth
              >
                {t("setupTotp")}
              </Button>
            ) : (
              <form onSubmit={handleEnableTotp} className="space-y-3">
                {setup.otpauthUrl ? (
                  <p className="break-all rounded-lg bg-surface-muted p-3 font-mono text-xs text-text">
                    {setup.otpauthUrl}
                  </p>
                ) : null}
                {setup.secret ? (
                  <p className="text-sm text-text">
                    {t("secret")}:{" "}
                    <span className="font-mono font-semibold">{setup.secret}</span>
                  </p>
                ) : null}
                <Input
                  inputMode="numeric"
                  label={t("totpCode")}
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  required
                  autoComplete="one-time-code"
                />
                <Button type="submit" disabled={busy} fullWidth>
                  {t("enableTotp")}
                </Button>
              </form>
            )}
          </>
        ) : (
          <form onSubmit={handleDisableTotp} className="space-y-3">
            <Input
              type="password"
              label={t("currentPassword")}
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              required
            />
            <Input
              inputMode="numeric"
              label={t("totpCodeOptional")}
              value={totpCode}
              onChange={(e) =>
                setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
            />
            <Button type="submit" variant="danger" disabled={busy} fullWidth>
              {t("disableTotp")}
            </Button>
          </form>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text">{t("sessionsTitle")}</h2>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || sessionsMissing}
            onClick={() => void handleRevokeOthers()}
          >
            {t("revokeOthers")}
          </Button>
        </div>
        {sessionsMissing ? (
          <p className="text-sm text-text-muted">{t("sessionsUnavailable")}</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noSessions")}</p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {s.current ? t("thisDevice") : s.userAgent || s.id}
                  </p>
                  <p className="text-xs text-text-muted">
                    {[s.ip, s.lastSeenAt || s.createdAt]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {!s.current ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={busy}
                    onClick={() => void handleRevoke(s.id)}
                  >
                    {t("revoke")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
