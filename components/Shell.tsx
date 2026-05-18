"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";

type Me = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
};

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/add-stock", label: "Add stock", staffOnly: true },
  { href: "/sell", label: "Sell" },
  { href: "/sales", label: "Sales" },
  { href: "/reservations", label: "Reservations" },
  { href: "/stock-history", label: "History", staffOnly: true },
  { href: "/categories", label: "Categories", staffOnly: true },
  { href: "/settings/emails", label: "Settings", ownerOnly: true },
];

const canManageStock = (role: string) =>
  role === "OWNER" || role === "STORE_STAFF";

export const Shell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/proxy/auth/me", { cache: "no-store" });
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = (await res.json()) as Me;
        setMe(data);
      } catch {
        setError("Could not load session");
      }
    };
    void load();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const visibleNav = nav.filter((item) => {
    if (item.ownerOnly && me?.role !== "OWNER") {
      return false;
    }
    if (item.staffOnly && me && !canManageStock(me.role) && me.role !== "OWNER") {
      return false;
    }
    return true;
  });

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <p className="text-sm text-rose-200">{error}</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <p className="text-sm text-white/70">Loading…</p>
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--brand-yellow)]/15 bg-[color:var(--brand-charcoal-deep)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <BrandLogo size="sm" linked />
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
              {visibleNav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-[var(--brand-yellow)]/20 text-[var(--accent)]"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="tap rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-[var(--brand-yellow)]/30 hover:bg-[var(--brand-yellow)]/10"
          >
            Log out
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-white/5 px-4 py-2 lg:hidden">
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ${
                  active
                    ? "bg-[var(--brand-yellow)]/20 text-[var(--accent)]"
                    : "text-white/70"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
};
