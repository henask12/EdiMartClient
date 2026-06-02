"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { BrandLogo } from "./BrandLogo";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import {
  Calendar,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Mail,
  MoreVertical,
  Package,
  Receipt,
  Shield,
  ShoppingCart,
  Users,
  Warehouse,
} from "@/lib/icons";
import { hasPermission, type Permission } from "@/lib/permissions";
import { cn } from "@/lib/cn";

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
  icon?: ComponentType<{ className?: string }>;
  permission?: Permission;
};

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package, permission: "PRODUCTS_VIEW" },
  { href: "/sell", label: "Sell", icon: ShoppingCart, permission: "SALES_CREATE" },
  { href: "/sales", label: "Sales", icon: Receipt, permission: "SALES_VIEW" },
];

const moreNav: NavItem[] = [
  { href: "/add-stock", label: "Stocks", icon: Warehouse, permission: "STOCK_RECEIVE" },
  { href: "/expiry", label: "Expiry", icon: Calendar, permission: "STOCK_HISTORY_VIEW" },
  { href: "/reservations", label: "Reservations", icon: ClipboardList, permission: "RESERVATIONS_MANAGE" },
  { href: "/expenses", label: "Expenses", icon: Receipt, permission: "EXPENSES_MANAGE" },
  { href: "/stock-history", label: "History", icon: ClipboardList, permission: "STOCK_HISTORY_VIEW" },
  { href: "/categories", label: "Categories", permission: "CATEGORIES_MANAGE" },
  { href: "/settings/users", label: "Users", icon: Users, permission: "USERS_MANAGE" },
  { href: "/settings/roles", label: "Roles", icon: Shield, permission: "ROLES_MANAGE" },
  { href: "/settings/emails", label: "Alert emails", icon: Mail, permission: "SETTINGS_EMAILS" },
];

const desktopNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package, permission: "PRODUCTS_VIEW" },
  { href: "/add-stock", label: "Stocks", icon: Warehouse, permission: "STOCK_RECEIVE" },
  { href: "/expiry", label: "Expiry", icon: Calendar, permission: "STOCK_HISTORY_VIEW" },
  { href: "/sell", label: "Sell", icon: ShoppingCart, permission: "SALES_CREATE" },
  { href: "/sales", label: "Sales", icon: Receipt, permission: "SALES_VIEW" },
  { href: "/reservations", label: "Reservations", icon: ClipboardList, permission: "RESERVATIONS_MANAGE" },
  { href: "/expenses", label: "Expenses", icon: Receipt, permission: "EXPENSES_MANAGE" },
  { href: "/stock-history", label: "History", icon: ClipboardList, permission: "STOCK_HISTORY_VIEW" },
  { href: "/categories", label: "Categories", permission: "CATEGORIES_MANAGE" },
  { href: "/settings/users", label: "Users", icon: Users, permission: "USERS_MANAGE" },
  { href: "/settings/roles", label: "Roles", icon: Shield, permission: "ROLES_MANAGE" },
  { href: "/settings/emails", label: "Emails", icon: Mail, permission: "SETTINGS_EMAILS" },
];

const canSeeNavItem = (item: NavItem, me: Me | null) => {
  if (!item.permission) return true;
  if (!me) return false;
  return hasPermission(me.permissions, item.permission);
};

const filterNav = (items: NavItem[], me: Me | null) =>
  items.filter((item) => canSeeNavItem(item, me));

const NavLink = ({
  item,
  active,
  compact,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
  onClick?: () => void;
}) => {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-md)] font-medium transition focus-ring",
        compact
          ? "flex-1 flex-col gap-0.5 py-2 text-[10px]"
          : "px-3 py-2 text-sm",
        active
          ? "bg-[var(--brand-yellow)]/15 text-[var(--accent)]"
          : "text-white/70 hover:bg-white/5 hover:text-white",
      )}
    >
      {Icon ? <Icon className={compact ? "size-5" : "size-4 shrink-0"} /> : null}
      <span>{item.label}</span>
    </Link>
  );
};

export const Shell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
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
        const { toastError } = await import("@/lib/toast");
        toastError("Could not load session");
      }
    };
    void load();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="app-bg flex min-h-screen flex-col pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-[var(--brand-yellow)]/15 bg-[color:var(--brand-charcoal-deep)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <BrandLogo size="sm" linked />
          <nav className="hidden flex-1 flex-wrap items-center justify-center gap-0.5 lg:flex" aria-label="Primary">
            {visibleDesktop.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/settings/account"
              className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-white/15 bg-white/5 text-sm font-bold text-[var(--accent)] focus-ring"
              aria-label="Account settings"
            >
              {initials}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
              icon={<LogOut className="size-4" />}
              onClick={() => void handleLogout()}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6">{children}</main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[color:var(--brand-charcoal-deep)]/95 backdrop-blur-md lg:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {filterNav(primaryNav, me).map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} compact />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold focus-ring",
              moreOpen ? "text-[var(--accent)]" : "text-white/55",
            )}
            aria-expanded={moreOpen}
            aria-label="More menu"
          >
            <MoreVertical className="size-5" aria-hidden />
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
            className="absolute bottom-16 left-0 right-0 mx-4 max-h-[60vh] overflow-y-auto rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--surface)] p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {visibleMore.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                onClick={() => setMoreOpen(false)}
              />
            ))}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                void handleLogout();
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium text-rose-200 hover:bg-white/5"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
