"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Kbd } from "@/components/ui/Kbd";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { formatMoney } from "@/lib/format-money";
import { formatDate, formatDateShort, formatEthiopianDate, isEthiopianCalendarSupported } from "@/lib/date-helpers";
import { Package, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";

export default function DesignPage() {
  const t = useTranslations("Design");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const now = new Date().toISOString();

  return (
    <div className="space-y-12">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      {/* Colour tokens */}
      <Section title="Colour tokens">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "bg-bg", className: "bg-bg border border-border" },
            { label: "bg-surface", className: "bg-surface border border-border" },
            { label: "bg-surface-muted", className: "bg-surface-muted border border-border" },
            { label: "bg-primary", className: "bg-primary text-white" },
            { label: "bg-accent", className: "bg-accent text-black" },
            { label: "bg-success", className: "bg-success text-white" },
            { label: "bg-warning", className: "bg-warning text-black" },
            { label: "bg-danger", className: "bg-danger text-white" },
          ].map((swatch) => (
            <div
              key={swatch.label}
              className={`flex items-center justify-center rounded-xl px-4 py-6 text-sm font-semibold ${swatch.className}`}
            >
              {swatch.label}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 text-sm">
          <p className="text-text">text-text — primary body text</p>
          <p className="text-text-muted">text-text-muted — secondary / labels</p>
          <p className="text-primary">text-primary — brand teal links</p>
          <p className="text-accent">text-accent — saffron emphasis</p>
          <p className="text-success">text-success — positive / saved</p>
          <p className="text-warning">text-warning — caution</p>
          <p className="text-danger">text-danger — errors / destructive</p>
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-text">Page title (3xl bold)</h1>
          <h2 className="text-2xl font-semibold text-text">Section heading (2xl semibold)</h2>
          <h3 className="text-lg font-semibold text-text">Card heading (lg semibold)</h3>
          <p className="text-sm text-text">Body text at the standard 14px size.</p>
          <p className="text-xs text-text-muted">Caption / helper text at 12px muted.</p>
          <p className="font-[family-name:var(--font-noto-ethiopic)] text-base text-text">
            የኢዲ ኮሌክሽን — Noto Sans Ethiopic for Amharic
          </p>
          <p className="tabular-nums text-lg font-semibold text-accent">
            {formatMoney("12345.67")} — tabular-nums
          </p>
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
        </div>
        <h4 className="mt-6 text-sm font-semibold text-text">Sizes</h4>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="pos">POS (lg touch)</Button>
        </div>
        <h4 className="mt-6 text-sm font-semibold text-text">Icon buttons</h4>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <IconButton icon={<Plus />} aria-label="Add" />
          <IconButton variant="secondary" icon={<Pencil />} aria-label="Edit" />
          <IconButton variant="danger" icon={<Trash2 />} aria-label="Delete" />
          <IconButton variant="ghost" icon={<Package />} aria-label="Package" />
        </div>
        <h4 className="mt-6 text-sm font-semibold text-text">With icon</h4>
        <div className="mt-2 flex flex-wrap gap-3">
          <Button icon={<Plus className="size-4" />}>Add product</Button>
          <Button variant="secondary" icon={<ShoppingCart className="size-4" />}>
            Sell
          </Button>
        </div>
      </Section>

      {/* Form controls */}
      <Section title="Form controls">
        <div className="grid max-w-md gap-4">
          <Input label="Product name" placeholder="e.g. Sugar 1kg" />
          <Input label="Quantity" type="number" placeholder="0" />
          <Input label="With error" error="This field is required" defaultValue="" />
          <Input label="Disabled" disabled defaultValue="Can't touch this" />
          <Select label="Category">
            <option value="">Choose…</option>
            <option value="drinks">Drinks</option>
            <option value="snacks">Snacks</option>
          </Select>
        </div>
      </Section>

      {/* Badges */}
      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">In stock</Badge>
          <Badge variant="warning">Low</Badge>
          <Badge variant="danger">OUT</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="neutral">Inactive</Badge>
          <Badge variant="accent">Featured</Badge>
        </div>
      </Section>

      {/* Cards */}
      <Section title="Cards & Stat cards">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Today" value={formatMoney("4850")} detail="12 sales" />
          <StatCard label="This week" value={formatMoney("32100")} detail="87 sales" />
          <StatCard label="This month" value={formatMoney("128750")} detail="312 sales" />
          <StatCard label="This year" value={formatMoney("1245000")} detail="3,104 sales" />
        </div>
        <div className="mt-4 max-w-md">
          <Card>
            <h3 className="text-sm font-semibold text-text">Basic Card</h3>
            <p className="mt-2 text-sm text-text-muted">
              Cards use bg-surface with a border-border outline and rounded-xl corners.
            </p>
          </Card>
        </div>
      </Section>

      {/* Loading states */}
      <Section title="Skeletons">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <div className="space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <SkeletonText />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </Section>

      {/* Empty state */}
      <Section title="Empty state">
        <div className="max-w-md">
          <EmptyState
            icon={<Package className="size-12" />}
            title="No products yet"
            description="Add your first product to get started with inventory tracking."
            action={
              <Button icon={<Plus className="size-4" />}>Add product</Button>
            }
          />
        </div>
      </Section>

      {/* Dialog */}
      <Section title="Dialog">
        <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm action</DialogTitle>
              <DialogDescription>
                Are you sure you want to proceed? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setDialogOpen(false)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      {/* Sheet */}
      <Section title="Sheet (side panel)">
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          Open sheet
        </Button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Product details</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <Input label="Name" defaultValue="Sugar 1kg" />
              <Input label="Price" type="number" defaultValue="85" />
              <Button fullWidth onClick={() => setSheetOpen(false)}>
                Save
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </Section>

      {/* Tooltip & Kbd */}
      <Section title="Tooltip & Keyboard hints">
        <div className="flex flex-wrap items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Button variant="secondary">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>This is a tooltip</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-sm text-text-muted">
            Keyboard shortcuts: <Kbd>⌘K</Kbd> <Kbd>Esc</Kbd> <Kbd>Enter</Kbd>
          </span>
        </div>
      </Section>

      {/* Formatters */}
      <Section title="Formatters">
        <Card>
          <div className="space-y-2 text-sm">
            <Row label="formatMoney('1250.50')" value={formatMoney("1250.50")} />
            <Row label="formatMoney('0')" value={formatMoney("0")} />
            <Row label="formatMoney(null)" value={formatMoney(null)} />
            <Row label={`formatDate('${now.slice(0, 16)}')`} value={formatDate(now)} />
            <Row label="formatDateShort(now)" value={formatDateShort(now)} />
            {isEthiopianCalendarSupported() ? (
              <Row label="formatEthiopianDate(now)" value={formatEthiopianDate(now) ?? "—"} />
            ) : (
              <Row label="Ethiopian calendar" value="Not supported in this browser" />
            )}
          </div>
        </Card>
      </Section>
    </div>
  );
}

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-4">
    <h2 className="text-lg font-semibold text-text">{title}</h2>
    {children}
  </section>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-2">
    <code className="text-xs text-text-muted">{label}</code>
    <span className="font-medium tabular-nums text-text">{value}</span>
  </div>
);
