"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";

type Me = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  mustChangePassword?: boolean;
  hasPin?: boolean;
  locale?: string;
};

export default function AccountSettingsPage() {
  const t = useTranslations("Account");
  const [me, setMe] = useState<Me | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinPassword, setPinPassword] = useState("");
  const [pinStatus, setPinStatus] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/proxy/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Me | null) => {
        if (data) {
          setMe(data);
          setDisplayName(data.displayName ?? "");
          setEmail(data.email);
        }
      });
  }, []);

  const handleProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);
    const res = await fetch("/api/proxy/auth/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName, email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setProfileStatus(
        typeof data.message === "string" ? data.message : t("updateFailed"),
      );
      return;
    }
    setMe(data as Me);
    setProfileStatus(t("profileUpdated"));
  };

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    const res = await fetch("/api/proxy/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPasswordStatus(
        typeof data.message === "string"
          ? data.message
          : t("couldNotChangePassword"),
      );
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setPasswordStatus(t("passwordUpdated"));
    if (me?.mustChangePassword) {
      window.location.assign("/dashboard");
    }
  };

  const savePin = async (remove: boolean) => {
    setPinStatus(null);
    const res = await fetch("/api/proxy/auth/pin", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        remove
          ? { currentPassword: pinPassword, remove: true }
          : { currentPassword: pinPassword, pin },
      ),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message;
      setPinStatus(
        typeof message === "string" ? message : t("couldNotSavePin"),
      );
      return;
    }
    setPin("");
    setPinPassword("");
    setMe((prev) =>
      prev ? { ...prev, hasPin: Boolean(data.hasPin) } : prev,
    );
    setPinStatus(data.hasPin ? t("pinSaved") : t("pinRemoved"));
  };

  if (!me) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <PageHeader
        title={t("title")}
        description={`${t("role")}: ${me.role}`}
      />

      {me.mustChangePassword ? (
        <p
          className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning"
          role="alert"
        >
          {t("mustChangePassword")}
        </p>
      ) : null}

      <Card>
        <form onSubmit={handleProfile} className="space-y-4">
          <h2 className="text-sm font-semibold text-text">{t("profile")}</h2>
          <Input
            label={t("displayName")}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Input
            type="email"
            required
            label={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {profileStatus ? (
            <p
              className={`text-sm ${profileStatus === t("profileUpdated") ? "text-success" : "text-danger"}`}
            >
              {profileStatus}
            </p>
          ) : null}
          <Button type="submit" fullWidth>
            {t("saveProfile")}
          </Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={handlePassword} className="space-y-4">
          <h2 className="text-sm font-semibold text-text">
            {t("changePassword")}
          </h2>
          <Input
            type="password"
            required
            label={t("currentPassword")}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            type="password"
            required
            minLength={8}
            label={t("newPassword")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {passwordStatus ? (
            <p
              className={`text-sm ${passwordStatus === t("passwordUpdated") ? "text-success" : "text-danger"}`}
            >
              {passwordStatus}
            </p>
          ) : null}
          <Button type="submit" variant="secondary" fullWidth>
            {t("updatePassword")}
          </Button>
        </form>
      </Card>

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void savePin(false);
          }}
          className="space-y-4"
        >
          <h2 className="text-sm font-semibold text-text">
            {t("approvalPin")}
          </h2>
          <p className="text-xs text-text-muted">
            {t("approvalPinDesc")}
            {me.hasPin ? ` ${t("pinSet")}` : ` ${t("noPinYet")}`}
          </p>
          <Input
            type="password"
            required
            label={t("currentPassword")}
            value={pinPassword}
            onChange={(e) => setPinPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            maxLength={6}
            label={me.hasPin ? t("newPin") : t("pin")}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            autoComplete="off"
          />
          {pinStatus ? (
            <p
              className={`text-sm ${pinStatus === t("pinSaved") || pinStatus === t("pinRemoved") ? "text-success" : "text-danger"}`}
              role="status"
            >
              {pinStatus}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={pin.length < 4 || !pinPassword}
              fullWidth
            >
              {me.hasPin ? t("changePin") : t("setPin")}
            </Button>
            {me.hasPin ? (
              <Button
                type="button"
                variant="danger"
                disabled={!pinPassword}
                onClick={() => void savePin(true)}
                fullWidth
              >
                {t("removePin")}
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
