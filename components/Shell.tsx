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
import { PermissionProvider, type Me } from "@/components/PermissionProvider";
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
  const tAuth = useTranslations("Auth");
  const [me, setMe] = useState<Me | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [tillRegistered, setTillRegistered] = useState(false);

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
        // Set locale cookie from user preference
        if (data.locale && data.locale !== "en") {
          document.cookie = `NEXT_LOCALE=${data.locale};path=/;max-age=31536000`;
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
      <div className="flex min-h-screen flex-col bg-bg">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-3 sm:px-4">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-text hover:bg-surface-muted focus-ring"
          >
            {tShell("exitPos")}
          </Link>
          {shiftPill}
          {tillRegistered ? (
            <span className="hidden rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary sm:inline">
              {tShell("tillRegistered")}
            </span>
          ) : null}
          <div className="flex-1" />
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
          <button
            type="button"
            onClick={cycleTheme}
            className="rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-text focus-ring"
            aria-label={tShell("theme")}
          >
            <ThemeIcon className="size-4" />
          </button>
          {tillRegistered ? (
            <button
              type="button"
              onClick={() => void handleSwitchUser()}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-text hover:bg-surface-muted focus-ring"
              aria-label={tShell("switchUser")}
            >
              {tShell("switchUser")}
            </button>
          ) : null}
          <span className="truncate text-sm font-medium text-text">
            {me.displayName ?? me.email}
          </span>
          <Link
            href="/settings/account"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface-muted text-sm font-bold text-primary focus-ring"
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

  return (
    <div className="flex min-h-screen">
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
          <div className="absolute left-0 top-0 h-full w-72 bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="text-lg font-bold text-text">Edi&apos;s</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-1 text-text-muted hover:text-text"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-3">
              <Sidebar
                me={me}
                collapsed={false}
                onToggleCollapse={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-md sm:px-6">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-md p-1.5 text-text-muted hover:text-text lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>

          {/* Command palette trigger */}
          <button
            type="button"
            onClick={() =>
              document.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                  bubbles: true,
                }),
              )
            }
            className="hidden flex-1 items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-text-muted transition hover:border-border-strong sm:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">{tShell("commandPalette")}</span>
            <Kbd>⌘K</Kbd>
          </button>
          <div className="flex-1 sm:hidden" />

          {shiftPill}

          {/* Theme toggle */}
          <button
            type="button"
            onClick={cycleTheme}
            className="rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-text focus-ring"
            aria-label={tShell("theme")}
            title={tShell("theme")}
          >
            <ThemeIcon className="size-4" />
          </button>

          {/* Language toggle */}
          <button
            type="button"
            onClick={() => handleSetLocale(me.locale === "am" ? "en" : "am")}
            className="rounded-md px-2 py-1 text-xs font-medium text-text-muted hover:bg-surface-muted hover:text-text focus-ring"
            aria-label={tShell("language")}
          >
            {(me as Me & { locale?: string }).locale === "am" ? "EN" : "አማ"}
          </button>

          {/* User */}
          <Link
            href="/settings/account"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface-muted text-sm font-bold text-primary focus-ring"
            aria-label={me.displayName ?? me.email}
          >
            {initials}
          </Link>

          {/* Logout */}
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="hidden rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-text focus-ring lg:block"
            aria-label={tShell("logOut")}
            title={tShell("logOut")}
          >
            <LogOut className="size-4" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">{pageBody}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-safe">
          {[
            { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { href: "/pos", label: "POS", icon: ShoppingCart },
            { href: "#scan", label: tShell("scan"), icon: ScanLine, center: true },
            { href: "/products", label: "Products", icon: Package },
            { href: "#more", label: "More", icon: MoreHorizontal },
          ].map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isMore = item.href === "#more";
            const isScan = item.href === "#scan";
            return (
              <Link
                key={item.href}
                href={isMore || isScan ? "#" : item.href}
                onClick={(e) => {
                  if (isMore) {
                    e.preventDefault();
                    setMobileMenuOpen(true);
                  }
                }}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition",
                  isScan
                    ? "text-primary"
                    : active
                      ? "text-primary"
                      : "text-text-muted hover:text-text",
                )}
              >
                <item.icon className={cn("size-5", isScan && "size-6")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="h-16 lg:hidden" />

      {/* Command palette */}
      <CommandPalette me={me} />
    </div>
  );
};
