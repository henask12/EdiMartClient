"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Warehouse,
  Calendar,
  ClipboardList,
  Tag,
  Users,
  Shield,
  Mail,
  Settings,
  Search,
  ArrowLeftRight,
  ClipboardCheck,
  ScanBarcode,
  Clock3,
  Building2,
  FileText,
  RotateCcw,
  Wallet,
  Truck,
  UserRound,
  Percent,
  Heart,
  BarChart3,
} from "lucide-react";
import { type Me } from "@/components/PermissionProvider";
import { meetsRequirement, requirementForPath, isOwnerRole } from "@/lib/permissions";
import { Dialog, DialogContent } from "@/components/ui/Dialog";

type PageEntry = {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  group: string;
};

const PAGES: PageEntry[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, group: "Pages" },
  { href: "/reports", labelKey: "reports", icon: BarChart3, group: "Pages" },
  { href: "/pos", labelKey: "sell", icon: ShoppingCart, group: "Sell" },
  { href: "/sales", labelKey: "sales", icon: Receipt, group: "Sell" },
  { href: "/shifts", labelKey: "shifts", icon: Clock3, group: "Sell" },
  { href: "/customers", labelKey: "customers", icon: UserRound, group: "Sell" },
  { href: "/promotions", labelKey: "promotions", icon: Percent, group: "Sell" },
  { href: "/settings/pos", labelKey: "posSettings", icon: Settings, group: "Settings" },
  { href: "/settings/loyalty", labelKey: "loyaltySettings", icon: Heart, group: "Settings" },
  { href: "/inventory", labelKey: "overview", icon: Warehouse, group: "Inventory" },
  { href: "/products", labelKey: "products", icon: Package, group: "Inventory" },
  { href: "/stock-lookup", labelKey: "stockLookup", icon: Search, group: "Inventory" },
  { href: "/add-stock", labelKey: "receiveStock", icon: Warehouse, group: "Inventory" },
  { href: "/transfers", labelKey: "transfers", icon: ArrowLeftRight, group: "Inventory" },
  { href: "/stock-counts", labelKey: "stockCounts", icon: ClipboardCheck, group: "Inventory" },
  { href: "/expiry", labelKey: "expiry", icon: Calendar, group: "Inventory" },
  { href: "/labels", labelKey: "labels", icon: ScanBarcode, group: "Inventory" },
  { href: "/stock-history", labelKey: "stockHistory", icon: ClipboardList, group: "Inventory" },
  { href: "/categories", labelKey: "categories", icon: Tag, group: "Inventory" },
  { href: "/product-types", labelKey: "productTypes", icon: Tag, group: "Inventory" },
  { href: "/reservations", labelKey: "reservations", icon: ClipboardList, group: "Inventory" },
  { href: "/reorder", labelKey: "reorderPlanner", icon: ClipboardList, group: "Purchasing" },
  { href: "/purchase-orders", labelKey: "purchaseOrders", icon: FileText, group: "Purchasing" },
  { href: "/suppliers", labelKey: "suppliers", icon: Building2, group: "Purchasing" },
  { href: "/supplier-bills", labelKey: "supplierBills", icon: Wallet, group: "Purchasing" },
  { href: "/supplier-returns", labelKey: "supplierReturns", icon: RotateCcw, group: "Purchasing" },
  { href: "/settings/purchasing", labelKey: "purchasingSettings", icon: Truck, group: "Settings" },
  { href: "/settings/locations", labelKey: "locations", icon: Warehouse, group: "Settings" },
  { href: "/settings/users", labelKey: "users", icon: Users, group: "Settings" },
  { href: "/settings/roles", labelKey: "roles", icon: Shield, group: "Settings" },
  { href: "/settings/emails", labelKey: "alertEmails", icon: Mail, group: "Settings" },
  { href: "/settings/security", labelKey: "security", icon: Shield, group: "Settings" },
  { href: "/audit", labelKey: "audit", icon: ClipboardList, group: "Settings" },
  { href: "/sync-review", labelKey: "syncReview", icon: ClipboardCheck, group: "Settings" },
  { href: "/settings/account", labelKey: "account", icon: Settings, group: "Settings" },
];

type Props = {
  me: Me;
};

export const CommandPalette = ({ me }: Props) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("Nav");
  const tShell = useTranslations("Shell");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const visiblePages = PAGES.filter((page) =>
    meetsRequirement(me.permissions, requirementForPath(page.href)),
  );

  const groups = [...new Set(visiblePages.map((p) => p.group))];

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showClose={false} className="overflow-hidden p-0">
        <Command className="flex flex-col" label={tShell("commandPalette")}>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 text-text-muted" />
            <Command.Input
              placeholder={tShell("commandPaletteHint")}
              className="h-12 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted/60"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-text-muted">
              {tShell("commandPaletteHint")}
            </Command.Empty>
            {groups.map((group) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-text-muted/60"
              >
                {visiblePages
                  .filter((p) => p.group === group)
                  .map((page) => {
                    const Icon = page.icon;
                    return (
                      <Command.Item
                        key={page.href}
                        value={t(page.labelKey)}
                        onSelect={() => handleSelect(page.href)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text aria-selected:bg-primary-soft aria-selected:text-primary"
                      >
                        <Icon className="size-4 shrink-0" />
                        <span>{t(page.labelKey)}</span>
                      </Command.Item>
                    );
                  })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
