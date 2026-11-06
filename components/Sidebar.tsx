"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  Package,
  Palette,
  Receipt,
  Settings,
  ShoppingCart,
  Tag,
  Warehouse,
  Mail,
  Shield,
  Users,
  ArrowLeftRight,
  ClipboardCheck,
  Search,
  ScanBarcode,
  Truck,
  Clock3,
  Building2,
  FileText,
  RotateCcw,
  Wallet,
  UserRound,
  Percent,
  Heart,
  RefreshCw,
  KeyRound,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { type Me } from "@/components/PermissionProvider";
import { meetsRequirement, requirementForPath, isOwnerRole } from "@/lib/permissions";
import { useOutboxStatus } from "@/lib/offline/use-outbox-status";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: number;
};

type NavGroup = {
  labelKey: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "sellGroup",
    items: [
      { href: "/pos", labelKey: "sell", icon: ShoppingCart },
      { href: "/sales", labelKey: "sales", icon: Receipt },
      { href: "/shifts", labelKey: "shifts", icon: Clock3 },
      { href: "/customers", labelKey: "customers", icon: UserRound },
      { href: "/promotions", labelKey: "promotions", icon: Percent },
    ],
  },
  {
    labelKey: "inventoryGroup",
    items: [
      { href: "/inventory", labelKey: "overview", icon: Warehouse },
      { href: "/products", labelKey: "products", icon: Package },
      { href: "/stock-lookup", labelKey: "stockLookup", icon: Search },
      { href: "/add-stock", labelKey: "receiveStock", icon: Truck },
      { href: "/transfers", labelKey: "transfers", icon: ArrowLeftRight },
      { href: "/stock-counts", labelKey: "stockCounts", icon: ClipboardCheck },
      { href: "/expiry", labelKey: "expiry", icon: Calendar },
      { href: "/labels", labelKey: "labels", icon: ScanBarcode },
      { href: "/stock-history", labelKey: "stockHistory", icon: ClipboardList },
      { href: "/categories", labelKey: "categories", icon: Tag },
      { href: "/product-types", labelKey: "productTypes", icon: Tag },
      { href: "/reservations", labelKey: "reservations", icon: ClipboardCheck },
    ],
  },
  {
    labelKey: "purchasingGroup",
    items: [
      { href: "/reorder", labelKey: "reorderPlanner", icon: ClipboardList },
      { href: "/purchase-orders", labelKey: "purchaseOrders", icon: FileText },
      { href: "/suppliers", labelKey: "suppliers", icon: Building2 },
      { href: "/supplier-bills", labelKey: "supplierBills", icon: Wallet },
      { href: "/supplier-returns", labelKey: "supplierReturns", icon: RotateCcw },
    ],
  },
];

/** POS settings → Alert emails — nested under Settings. */
const SETTINGS_ITEMS: NavItem[] = [
  { href: "/settings/pos", labelKey: "posSettings", icon: ShoppingCart },
  { href: "/settings/purchasing", labelKey: "purchasingSettings", icon: Truck },
  { href: "/settings/loyalty", labelKey: "loyaltySettings", icon: Heart },
  { href: "/settings/locations", labelKey: "locations", icon: Warehouse },
  { href: "/settings/security", labelKey: "security", icon: KeyRound },
  { href: "/audit", labelKey: "audit", icon: ScrollText },
  { href: "/settings/users", labelKey: "users", icon: Users },
  { href: "/settings/roles", labelKey: "roles", icon: Shield },
  { href: "/settings/emails", labelKey: "alertEmails", icon: Mail },
];

const isSettingsPath = (pathname: string) =>
  pathname.startsWith("/settings") || pathname === "/audit" || pathname.startsWith("/audit/");

type SidebarProps = {
  me: Me;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export const Sidebar = ({ me, collapsed, onToggleCollapse }: SidebarProps) => {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const outbox = useOutboxStatus();
  const syncBadge = outbox.pendingSales + outbox.needsAttention;
  const [settingsOpen, setSettingsOpen] = useState(() => isSettingsPath(pathname));

  useEffect(() => {
    if (isSettingsPath(pathname)) {
      setSettingsOpen(true);
    }
  }, [pathname]);

  const canSee = (item: NavItem) =>
    !item.disabled && meetsRequirement(me.permissions, requirementForPath(item.href));

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const visibleSettings = SETTINGS_ITEMS.filter(canSee);
  const settingsActive = visibleSettings.some((item) => isActive(item.href));

  const renderItem = (item: NavItem, opts?: { nested?: boolean }) => {
    const visible = canSee(item);
    if (!visible) return null;

    const Icon = item.icon;
    const active = isActive(item.href);
    const label = t(item.labelKey);
    const badge = item.badge;
    const nested = opts?.nested === true;

    const link = (
      <Link
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-ring",
          active
            ? "bg-primary-soft text-primary"
            : "text-text-muted hover:bg-surface-muted hover:text-text",
          collapsed && "justify-center px-2",
          nested && !collapsed && "py-1.5 pl-9 text-[13px]",
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon className={cn("shrink-0", nested && !collapsed ? "size-4" : "size-5")} />
        {!collapsed ? (
          <>
            <span className="truncate flex-1">{label}</span>
            {badge && badge > 0 ? (
              <span className="rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning">
                {badge}
              </span>
            ) : null}
          </>
        ) : null}
      </Link>
    );

    // Avoid TooltipTrigger asChild + Next Link (Radix Slot 1.5 breaks under React 19).
    if (collapsed) {
      return (
        <div key={item.href} title={label}>
          {link}
        </div>
      );
    }

    return <div key={item.href}>{link}</div>;
  };

  return (
    <aside
      className={cn(
        "sticky top-0 z-20 hidden h-screen min-h-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-[72px]" : "w-60",
      )}
    >
      {/* Logo + collapse */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        {!collapsed ? (
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-text focus-ring"
          >
            Edi&apos;s
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-text focus-ring",
            collapsed && "mx-auto",
          )}
          aria-label={collapsed ? t("expand") : t("collapse")}
        >
          <ChevronLeft
            className={cn(
              "size-4 transition-transform",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Full-height scroll: Dashboard → Design → Settings submenu */}
      <nav
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
        aria-label="Main"
      >
        <div className="space-y-1">
          {renderItem({
            href: "/dashboard",
            labelKey: "dashboard",
            icon: LayoutDashboard,
          })}
          {renderItem({
            href: "/reports",
            labelKey: "reports",
            icon: BarChart3,
          })}
          {syncBadge > 0
            ? renderItem({
                href: "/sync-review",
                labelKey: "syncReview",
                icon: RefreshCw,
                badge: syncBadge,
              })
            : null}
        </div>

        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(canSee);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.labelKey} className="mt-5">
              {!collapsed ? (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-text-muted/60">
                  {t(group.labelKey)}
                </p>
              ) : (
                <div className="mx-auto mb-2 h-px w-8 bg-border" />
              )}
              <div className="space-y-0.5">{group.items.map((item) => renderItem(item))}</div>
            </div>
          );
        })}

        {/* Design (owner) — still in the long scroll, above Settings */}
        {isOwnerRole(me.role) ? (
          <div className="mt-5 space-y-0.5">
            {renderItem({
              href: "/design",
              labelKey: "design",
              icon: Palette,
            })}
          </div>
        ) : null}

        {/* Settings submenu: POS settings → Alert emails */}
        {visibleSettings.length > 0 ? (
          <div className="mt-5">
            {collapsed ? (
              <>
                <div className="mx-auto mb-2 h-px w-8 bg-border" />
                <div className="space-y-0.5" title={t("settings")}>
                  {visibleSettings.map((item) => renderItem(item))}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSettingsOpen((open) => !open)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-ring",
                    settingsActive
                      ? "bg-primary-soft/60 text-primary"
                      : "text-text-muted hover:bg-surface-muted hover:text-text",
                  )}
                  aria-expanded={settingsOpen}
                  aria-controls="sidebar-settings-submenu"
                >
                  <Settings className="size-5 shrink-0" />
                  <span className="flex-1 truncate text-left">{t("settings")}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 transition-transform",
                      settingsOpen && "rotate-180",
                    )}
                  />
                </button>
                {settingsOpen ? (
                  <div
                    id="sidebar-settings-submenu"
                    className="mt-0.5 space-y-0.5 border-l border-border/80 ml-4 pl-1"
                    role="group"
                    aria-label={t("settings")}
                  >
                    {visibleSettings.map((item) => renderItem(item, { nested: true }))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </nav>
    </aside>
  );
};
