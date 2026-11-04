"use client";

import { FormEvent, useEffect, useState } from "react";

type Me = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  mustChangePassword?: boolean;
  hasPin?: boolean;
};

export default function AccountSettingsPage() {
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
      setProfileStatus(typeof data.message === "string" ? data.message : "Update failed");
      return;
    }
    setMe(data as Me);
    setProfileStatus("Profile updated");
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
      setPasswordStatus(typeof data.message === "string" ? data.message : "Could not change password");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setPasswordStatus("Password updated");
    if (me?.mustChangePassword) {
      // Full reload so the app picks up the cleared flag.
      window.location.assign("/dashboard");
    }
  };

  const savePin = async (remove: boolean) => {
    setPinStatus(null);
    const res = await fetch("/api/proxy/auth/pin", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(remove ? { currentPassword: pinPassword, remove: true } : { currentPassword: pinPassword, pin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = Array.isArray(data.message) ? data.message.join(", ") : data.message;
      setPinStatus(typeof message === "string" ? message : "Could not save the PIN");
      return;
    }
    setPin("");
    setPinPassword("");
    setMe((prev) => (prev ? { ...prev, hasPin: Boolean(data.hasPin) } : prev));
    setPinStatus(data.hasPin ? "PIN saved" : "PIN removed");
  };

  if (!me) {
    return <p className="text-sm text-white/60">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">My account</h1>
        <p className="mt-2 text-sm text-white/60">Role: {me.role}</p>
        {me.mustChangePassword ? (
          <p
            className="mt-4 rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-100"
            role="alert"
          >
            For your security, choose a new password before you continue. The one you signed in with
            was set up for you and must be replaced.
          </p>
        ) : null}
      </div>

      <form onSubmit={handleProfile} className="space-y-4 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-5">
        <h2 className="text-sm font-semibold text-white/80">Profile</h2>
        <label className="block text-sm text-white/70">
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-white/70">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        {profileStatus ? (
          <p className={`text-sm ${profileStatus.includes("updated") ? "text-[var(--accent)]" : "text-rose-200"}`}>
            {profileStatus}
          </p>
        ) : null}
        <button type="submit" className="tap btn-primary w-full py-3 text-sm">
          Save profile
        </button>
      </form>

      <form onSubmit={handlePassword} className="space-y-4 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-5">
        <h2 className="text-sm font-semibold text-white/80">Change password</h2>
        <label className="block text-sm text-white/70">
          Current password
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-white/70">
          New password
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        {passwordStatus ? (
          <p className={`text-sm ${passwordStatus.includes("updated") ? "text-[var(--accent)]" : "text-rose-200"}`}>
            {passwordStatus}
          </p>
        ) : null}
        <button type="submit" className="tap w-full rounded-full border border-white/15 py-3 text-sm font-semibold text-white">
          Update password
        </button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void savePin(false);
        }}
        className="space-y-4 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-5"
      >
        <h2 className="text-sm font-semibold text-white/80">Approval PIN</h2>
        <p className="text-xs text-white/50">
          A 4 to 6 digit PIN lets you approve things for your team at the till (for example a large stock
          correction) without handing over your password. Only people whose role can approve will be asked.
          {me.hasPin ? " You have a PIN set." : " You have no PIN yet."}
        </p>
        <label className="block text-sm text-white/70">
          Current password
          <input
            type="password"
            required
            value={pinPassword}
            onChange={(e) => setPinPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-white/70">
          {me.hasPin ? "New PIN" : "PIN"}
          <input
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            autoComplete="off"
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 tracking-widest text-white"
          />
        </label>
        {pinStatus ? (
          <p
            className={`text-sm ${pinStatus.startsWith("PIN saved") || pinStatus.startsWith("PIN removed") ? "text-[var(--accent)]" : "text-rose-200"}`}
            role="status"
          >
            {pinStatus}
          </p>
        ) : null}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pin.length < 4 || !pinPassword}
            className="tap w-full rounded-full border border-white/15 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {me.hasPin ? "Change PIN" : "Set PIN"}
          </button>
          {me.hasPin ? (
            <button
              type="button"
              disabled={!pinPassword}
              onClick={() => void savePin(true)}
              className="tap w-full rounded-full border border-rose-400/30 py-3 text-sm font-semibold text-rose-200 disabled:opacity-40"
            >
              Remove PIN
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
