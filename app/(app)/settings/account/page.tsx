"use client";

import { FormEvent, useEffect, useState } from "react";

type Me = { id: string; email: string; displayName: string | null; role: string };

export default function AccountSettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

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
  };

  if (!me) {
    return <p className="text-sm text-white/60">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">My account</h1>
        <p className="mt-2 text-sm text-white/60">Role: {me.role}</p>
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
            minLength={6}
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
    </div>
  );
}
