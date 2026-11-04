"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Calendar,
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
  type LucideIcon,
} from "lucide-react";
import { type Me } from "@/components/PermissionProvider";
import { meetsRequirement, requirementForPath, isOwnerRole } from "@/lib/permissions";
import { cn } from "@/lib/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

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
      { href: "/sell", labelKey: "sell", icon: ShoppingCart },
      { href: "/sales", labelKey: "sales", icon: Receipt },
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
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: "/settings/locations", labelKey: "locations", icon: Warehouse },
  { href: "/settings/users", labelKey: "users", icon: Users },
  { href: "/settings/roles", labelKey: "roles", icon: Shield },
  { href: "/settings/emails", labelKey: "alertEmails", icon: Mail },
];

type SidebarProps = {
  me: Me;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export const Sidebar = ({ me, collapsed, onToggleCollapse }: SidebarProps) => {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  const canSee = (item: NavItem) =>
    !item.disabled && meetsRequirement(me.permissions, requirementForPath(item.href));

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const renderItem = (item: NavItem) => {
    const visible = canSee(item);
    if (!visible) return null;

    const Icon = item.icon;
    const active = isActive(item.href);
    const label = t(item.labelKey);

    const link = (
      <Link
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-ring",
          active
            ? "bg-primary-soft text-primary"
            : "text-text-muted hover:bg-surface-muted hover:text-text",
          collapsed && "justify-center px-2",
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="size-5 shrink-0" />
        {!collapsed ? <span className="truncate">{label}</span> : null}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{link}</div>;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "sticky top-0 z-20 hidden h-screen flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-60",
        )}
      >
        {/* Logo + collapse */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
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

        {/* Dashboard link */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
          <div className="space-y-1">
            {renderItem({
              href: "/dashboard",
              labelKey: "dashboard",
              icon: LayoutDashboard,
            })}
          </div>

          {/* Grouped nav */}
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(canSee);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.labelKey} className="mt-6">
                {!collapsed ? (
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-text-muted/60">
                    {t(group.labelKey)}
                  </p>
                ) : (
                  <div className="mx-auto mb-2 h-px w-8 bg-border" />
                )}
                <div className="space-y-1">
                  {group.items.map(renderItem)}
                </div>
              </div>
            );
          })}

          {/* Design page (owner only) */}
          {isOwnerRole(me.role)
            ? renderItem({
                href: "/design",
                labelKey: "design",
                icon: Palette,
              })
            : null}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border px-3 py-3">
          <div className="space-y-1">
            {BOTTOM_ITEMS.map(renderItem)}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
};
