"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Search,
  ShoppingCart,
  Sun,
  Monitor,
  X,
  ScanLine,
  MoreHorizontal,
} from "lucide-react";
import { AccessDenied } from "@/components/AccessDenied";
import { CommandPalette } from "@/components/CommandPalette";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PermissionProvider, type Me } from "@/components/PermissionProvider";
import { PwaInstall } from "@/components/PwaInstall";
import { Sidebar } from "@/components/Sidebar";
import { Kbd } from "@/components/ui/Kbd";
import { formatDate } from "@/lib/date-helpers";
import {
  meetsRequirement,
  missingFrom,
  permissionName,
  requirementForPath,
  isOwnerRole,
} from "@/lib/permissions";
import { useOutboxStatus } from "@/lib/offline/use-outbox-status";
import { isTillRegistered } from "@/lib/register-device";
import { fetchCurrentShift, openerName, type Shift } from "@/lib/shifts";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/cn";

const SIDEBAR_KEY = "edimart-sidebar-collapsed";

export const Shell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const tShell = useTranslations("Shell");
  const tNav = useTranslations("Nav");
  const tAuth = useTranslations("Auth");
  const [me, setMe] = useState<Me | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [tillRegistered, setTillRegistered] = useState(false);
  const outbox = useOutboxStatus();

  // Restore sidebar state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY);
      if (saved === "true") setCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    setTillRegistered(isTillRegistered());
    let cancelled = false;
    const loadShift = async () => {
      const shift = await fetchCurrentShift();
      if (!cancelled) setCurrentShift(shift);
    };
    void loadShift();
    const onFocus = () => void loadShift();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Intercept 401/403 from proxy calls
  useEffect(() => {
    const originalFetch = window.fetch;
    let redirecting = false;
    let lastDeniedToast = 0;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch(...args);
      const input = args[0];
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.pathname
            : input.url;
      if (!redirecting && url.includes("/api/proxy/")) {
        if (res.status === 401) {
          redirecting = true;
          const here = window.location.pathname + window.location.search;
          window.location.assign(`/login?next=${encodeURIComponent(here)}`);
        } else if (res.status === 403) {
          const body = await res.clone().json().catch(() => null);
          if (body?.code === "PASSWORD_CHANGE_REQUIRED") {
            redirecting = true;
            window.location.assign("/settings/account");
          } else if (!String(body?.code ?? "").startsWith("APPROVAL_")) {
            const now = Date.now();
            if (now - lastDeniedToast > 4000) {
              lastDeniedToast = now;
              toastError(tAuth("noAccess"));
            }
          }
        }
      }
      return res;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [tAuth]);

  // Load session
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/proxy/auth/me", { cache: "no-store" });
        if (!res.ok) {
          const here = window.location.pathname + window.location.search;
          router.replace(`/login?next=${encodeURIComponent(here)}`);
          return;
        }
        const data = (await res.json()) as Me;
        if (
          data.mustChangePassword &&
          window.location.pathname !== "/settings/account"
        ) {
          router.replace("/settings/account");
        }
        setMe({
          ...data,
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
        });
        // Default language is English; Amharic only when the user saved that preference.
        const locale = data.locale === "am" ? "am" : "en";
        const existing = document.cookie
          .split("; ")
          .find((row) => row.startsWith("NEXT_LOCALE="))
          ?.split("=")[1];
        document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`;
        if (existing && existing !== locale) {
          window.location.reload();
          return;
        }
      } catch {
        toastError(tAuth("networkError"));
      }
    };
    void load();
  }, [router, tAuth]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const handleSwitchUser = async () => {
    const next = pathname.startsWith("/pos") ? "/pos" : pathname;
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(`/login?next=${encodeURIComponent(next)}`);
    router.refresh();
  };

  const shiftPill = (
    <Link
      href="/shifts"
      className={cn(
        "hidden max-w-[14rem] truncate rounded-full px-2.5 py-1 text-xs font-medium md:inline-flex",
        currentShift?.status === "OPEN"
          ? "bg-success-soft text-success"
          : "bg-surface-muted text-text-muted",
      )}
      title={
        currentShift?.status === "OPEN"
          ? `${tShell("shiftOpen")} · ${openerName(currentShift)} · ${formatDate(currentShift.openedAt)}`
          : tShell("noShift")
      }
    >
      {currentShift?.status === "OPEN"
        ? `${tShell("shiftOpen")} · ${openerName(currentShift)}`
        : tShell("noShift")}
    </Link>
  );

  const handleSetLocale = async (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`;
    await fetch("/api/proxy/auth/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    window.location.reload();
  };

  // Loading state
  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-text-muted">{tShell("commandPaletteHint") ? "Loading…" : "Loading…"}</div>
      </div>
    );
  }

  const pageRequirement = requirementForPath(pathname);
  const pageAllowed = meetsRequirement(me.permissions, pageRequirement);
  const initials = (me.displayName ?? me.email).slice(0, 1).toUpperCase();
  const isPosFocus = pathname === "/pos" || pathname.startsWith("/pos/");

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  const pageBody = (
    <PermissionProvider me={me}>
      {pageRequirement && !pageAllowed ? (
        <AccessDenied
          needs={missingFrom(me.permissions, pageRequirement).map(permissionName)}
        />
      ) : (
        children
      )}
    </PermissionProvider>
  );

  if (isPosFocus) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <OfflineBanner compact />
        <PwaInstall mode="banner" />
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-border bg-surface px-2 sm:gap-3 sm:px-4 pt-[env(safe-area-inset-top)]">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-2.5 text-sm font-semibold text-text hover:bg-surface-muted focus-ring sm:px-3"
          >
            {tShell("exitPos")}
          </Link>
          <div className="min-w-0">{shiftPill}</div>
          {tillRegistered ? (
            <span className="hidden rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary sm:inline">
              {tShell("tillRegistered")}
            </span>
          ) : null}
          <div className="flex-1" />
          {outbox.pendingSales > 0 || outbox.needsAttention > 0 ? (
            <Link
              href="/sync-review"
              className="hidden rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning sm:inline-flex"
            >
              {tShell("offlineWaiting", { count: outbox.pendingSales || outbox.needsAttention })}
            </Link>
          ) : null}
          <span
            className={cn(
              "hidden items-center gap-1.5 text-xs font-medium sm:inline-flex",
              online ? "text-success" : "text-danger",
            )}
            aria-live="polite"
          >
            <span
              className={cn(
                "size-2 rounded-full",
                online ? "bg-success" : "bg-danger",
              )}
            />
            {online ? tShell("online") : tShell("offline")}
          </span>
          <PwaInstall mode="button" force />
          <button
            type="button"
            onClick={cycleTheme}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-surface-muted hover:text-text focus-ring"
            aria-label={tShell("theme")}
          >
            <ThemeIcon className="size-4" />
          </button>
          {tillRegistered ? (
            <button
              type="button"
              onClick={() => void handleSwitchUser()}
              className="hidden rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-text hover:bg-surface-muted focus-ring sm:inline-flex"
              aria-label={tShell("switchUser")}
            >
              {tShell("switchUser")}
            </button>
          ) : null}
          <span className="hidden max-w-[8rem] truncate text-sm font-medium text-text sm:inline">
            {me.displayName ?? me.email}
          </span>
          <Link
            href="/settings/account"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface-muted text-sm font-bold text-primary focus-ring sm:size-9"
            aria-label={me.displayName ?? me.email}
          >
            {initials}
          </Link>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{pageBody}</main>
        <CommandPalette me={me} />
      </div>
    );
  }

  const openCommandPalette = () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      }),
    );
  };

  return (
    <div className="flex min-h-dvh overflow-x-hidden">
      {/* Desktop sidebar */}
      <Sidebar
        me={me}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col bg-surface shadow-xl pt-[env(safe-area-inset-top)]">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="text-lg font-bold text-text">Edi&apos;s</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="tap inline-flex items-center justify-center rounded-md text-text-muted hover:text-text focus-ring"
                aria-label={tShell("closeMenu")}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Sidebar
                me={me}
                collapsed={false}
                onToggleCollapse={() => setMobileMenuOpen(false)}
                forceMobile
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur-md sm:min-h-16 sm:gap-3 sm:px-6 pt-[env(safe-area-inset-top)]">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="tap inline-flex items-center justify-center rounded-md text-text-muted hover:text-text focus-ring lg:hidden"
            aria-label={tShell("openMenu")}
          >
            <Menu className="size-5" />
          </button>

          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-text-muted transition hover:border-border-strong sm:flex"
          >
            <Search className="size-4 shrink-0" />
            <span className="flex-1 truncate text-left">{tShell("commandPalette")}</span>
            <Kbd>⌘K</Kbd>
          </button>
          <button
            type="button"
            onClick={openCommandPalette}
            className="tap inline-flex items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text focus-ring sm:hidden"
            aria-label={tShell("commandPalette")}
          >
            <Search className="size-5" />
          </button>
          <div className="min-w-0 flex-1 sm:hidden" />

          {shiftPill}

          <PwaInstall mode="button" force />

          <button
            type="button"
            onClick={cycleTheme}
            className="tap inline-flex items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text focus-ring"
            aria-label={tShell("theme")}
            title={tShell("theme")}
          >
            <ThemeIcon className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => handleSetLocale(me.locale === "am" ? "en" : "am")}
            className="tap inline-flex items-center justify-center rounded-md px-2 text-xs font-medium text-text-muted hover:bg-surface-muted hover:text-text focus-ring"
            aria-label={tShell("language")}
          >
            {(me as Me & { locale?: string }).locale === "am" ? "EN" : "አማ"}
          </button>

          <Link
            href="/settings/account"
            className="tap inline-flex items-center justify-center rounded-lg border border-border bg-surface-muted text-sm font-bold text-primary focus-ring"
            aria-label={me.displayName ?? me.email}
          >
            {initials}
          </Link>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="tap hidden items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text focus-ring lg:inline-flex"
            aria-label={tShell("logOut")}
            title={tShell("logOut")}
          >
            <LogOut className="size-4" />
          </button>
        </header>

        <main className="flex-1 px-3 py-4 sm:p-6">
          <div className="mx-auto max-w-7xl pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
            {pageBody}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden pb-safe"
        aria-label={tShell("mobileNav")}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
          {[
            { href: "/dashboard", label: tNav("dashboard"), icon: LayoutDashboard },
            { href: "/pos", label: tNav("sell"), icon: ShoppingCart },
            { href: "/stock-lookup", label: tShell("scan"), icon: ScanLine, emphasize: true },
            { href: "/products", label: tNav("products"), icon: Package },
            { href: "#more", label: tShell("more"), icon: MoreHorizontal },
          ].map((item) => {
            const active =
              item.href !== "#more" &&
              (pathname === item.href || pathname.startsWith(`${item.href}/`));
            const isMore = item.href === "#more";
            return (
              <Link
                key={item.href}
                href={isMore ? "#" : item.href}
                onClick={(e) => {
                  if (isMore) {
                    e.preventDefault();
                    setMobileMenuOpen(true);
                  }
                }}
                className={cn(
                  "tap flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition",
                  item.emphasize || active
                    ? "text-primary"
                    : "text-text-muted hover:text-text",
                )}
              >
                <item.icon className={cn("size-5", item.emphasize && "size-6")} />
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <CommandPalette me={me} />
    </div>
  );
};
