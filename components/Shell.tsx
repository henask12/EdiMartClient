"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { hasPermission, type Permission } from "@/lib/permissions";

type Me = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  permissions: string[];
};

type NavItem = {
  href: string;
  label: string;
  icon?: string;
  permission?: Permission;
  ownerOnly?: boolean;
};

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "⌂" },
  { href: "/products", label: "Products", icon: "▦", permission: "PRODUCTS_VIEW" },
  { href: "/sell", label: "Sell", icon: "◎", permission: "SALES_CREATE" },
  { href: "/sales", label: "Sales", icon: "₿", permission: "SALES_VIEW" },
];

const moreNav: NavItem[] = [
  { href: "/add-stock", label: "Add stock", permission: "STOCK_RECEIVE" },
  { href: "/reservations", label: "Reservations", permission: "RESERVATIONS_MANAGE" },
  { href: "/stock-history", label: "History", permission: "STOCK_HISTORY_VIEW" },
  { href: "/categories", label: "Categories", permission: "CATEGORIES_MANAGE" },
  { href: "/product-types", label: "Types", permission: "PRODUCT_TYPES_MANAGE" },
  { href: "/settings/account", label: "My account" },
  { href: "/settings/users", label: "Users", permission: "USERS_MANAGE" },
  { href: "/settings/emails", label: "Alert emails", permission: "SETTINGS_EMAILS" },
];

const desktopNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products", permission: "PRODUCTS_VIEW" },
  { href: "/add-stock", label: "Add stock", permission: "STOCK_RECEIVE" },
  { href: "/sell", label: "Sell", permission: "SALES_CREATE" },
  { href: "/sales", label: "Sales", permission: "SALES_VIEW" },
  { href: "/reservations", label: "Reservations", permission: "RESERVATIONS_MANAGE" },
  { href: "/stock-history", label: "History", permission: "STOCK_HISTORY_VIEW" },
  { href: "/categories", label: "Categories", permission: "CATEGORIES_MANAGE" },
  { href: "/product-types", label: "Types", permission: "PRODUCT_TYPES_MANAGE" },
  { href: "/settings/account", label: "Account" },
  { href: "/settings/users", label: "Users", permission: "USERS_MANAGE" },
  { href: "/settings/emails", label: "Emails", permission: "SETTINGS_EMAILS" },
];

const canSeeNavItem = (item: NavItem, me: Me | null) => {
  if (!item.permission) return true;
  if (!me) return false;
  return hasPermission(me.permissions, item.permission);
};

const filterNav = (items: NavItem[], me: Me | null) =>
  items.filter((item) => canSeeNavItem(item, me));

export const Shell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/proxy/auth/me", { cache: "no-store" });
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = (await res.json()) as Me;
        setMe({
          ...data,
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
        });
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

  const visibleDesktop = filterNav(desktopNav, me);
  const visibleMore = filterNav(moreNav, me);
  const initials = (me.displayName ?? me.email).slice(0, 1).toUpperCase();

  return (
    <div className="app-bg flex min-h-screen flex-col pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-[var(--brand-yellow)]/15 bg-[color:var(--brand-charcoal-deep)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <BrandLogo size="sm" linked />
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Primary">
            {visibleDesktop.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
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
          <div className="flex items-center gap-2">
            <Link
              href="/settings/account"
              className="tap flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-bold text-[var(--accent)]"
              aria-label="Account settings"
            >
              {initials}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 lg:inline-flex"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:py-8">{children}</main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[color:var(--brand-charcoal-deep)]/95 backdrop-blur-md lg:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {filterNav(primaryNav, me).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`tap flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
                  active ? "text-[var(--accent)]" : "text-white/55"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className={`tap flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
              moreOpen ? "text-[var(--accent)]" : "text-white/55"
            }`}
            aria-expanded={moreOpen}
            aria-label="More menu"
          >
            <span className="text-lg leading-none">⋯</span>
            More
          </button>
        </div>
      </nav>

      {moreOpen ? (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="presentation"
          onClick={() => setMoreOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-16 left-0 right-0 mx-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-white/10 bg-[color:var(--surface)] p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {visibleMore.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-white hover:bg-white/5"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                void handleLogout();
              }}
              className="mt-2 w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-rose-200"
            >
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
