"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ExportMenu } from "@/components/ExportMenu";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import { Pagination } from "@/components/Pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { formatMoney } from "@/lib/format-money";
import { usePermission } from "@/components/PermissionProvider";
import { paymentLabel } from "@/lib/payment-methods";
import { toastError } from "@/lib/toast";
import { formatDate } from "@/lib/date-helpers";

type Attachment = { id: string; imageUrl: string };
type SaleLine = {
  id: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  unitCostAtSale: string;
  netProfit?: string;
  product: { name: string; category?: { name: string } };
};
type Sale = {
  id: string;
  saleNumber: string;
  createdAt: string;
  lines: SaleLine[];
  attachments?: Attachment[];
  payments?: { method: string; reference: string | null }[];
  createdBy: { displayName: string | null; email: string };
};

type SaleLineRow = {
  rowKey: string;
  saleId: string;
  item: string;
  salesDate: string;
  cashier: string;
  payment: string;
  unitPrice: string;
  quantity: string;
  lineTotal: string;
  netProfit?: string;
  attachments: Attachment[];
};

type Category = { id: string; name: string };
type Product = { id: string; name: string };

const flattenSales = (sales: Sale[]): SaleLineRow[] =>
  sales.flatMap((sale) =>
    sale.lines.map((line) => ({
      rowKey: `${sale.id}-${line.id}`,
      saleId: sale.id,
      item: line.product.name,
      salesDate: sale.createdAt,
      cashier: sale.createdBy.displayName ?? sale.createdBy.email,
      payment:
        (sale.payments ?? []).map((p) => paymentLabel(p.method)).join(" + ") ||
        "—",
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      lineTotal: line.lineTotal,
      netProfit: line.netProfit,
      attachments: sale.attachments ?? [],
    })),
  );

export default function SalesPage() {
  const searchParams = useSearchParams();
  const { can, canSeeCost } = usePermission();
  const t = useTranslations("Sales");
  const urlFrom = searchParams.get("from") ?? "";
  const urlTo = searchParams.get("to") ?? "";

  const [items, setItems] = useState<Sale[]>([]);
  const [from, setFrom] = useState(urlFrom);
  const [to, setTo] = useState(urlTo);
  const [draftFrom, setDraftFrom] = useState(urlFrom);
  const [draftTo, setDraftTo] = useState(urlTo);
  const [dateError, setDateError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [productId, setProductId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);

  const lineRows = useMemo(() => flattenSales(items), [items]);

  const pageSubtotals = useMemo(() => {
    const lineTotal = lineRows.reduce(
      (sum, r) => sum + Number(r.lineTotal),
      0,
    );
    const netProfit = lineRows.reduce(
      (sum, r) => sum + Number(r.netProfit ?? 0),
      0,
    );
    return { lineTotal, netProfit };
  }, [lineRows]);

  useEffect(() => {
    if (!can("PRODUCTS_VIEW")) return;
    void Promise.all([
      fetch("/api/proxy/categories", { cache: "no-store" }),
      fetch("/api/proxy/products?take=300", { cache: "no-store" }),
    ]).then(async ([catRes, prodRes]) => {
      if (catRes.ok) setCategories((await catRes.json()) as Category[]);
      if (prodRes.ok) {
        const data = (await prodRes.json()) as { items: Product[] };
        setProducts(data.items);
      }
    });
  }, [can]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        take: String(pageSize),
        skip: String((page - 1) * pageSize),
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (productId) params.set("productId", productId);
      if (categoryId) params.set("categoryId", categoryId);
      const res = await fetch(`/api/proxy/sales?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load sales");
      const data = (await res.json()) as { items: Sale[]; total: number };
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to load sales");
    }
  }, [from, to, productId, categoryId, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApplyDates = () => {
    if (draftFrom && draftTo && draftFrom > draftTo) {
      setDateError(t("dateError"));
      return;
    }
    setDateError(null);
    setFrom(draftFrom);
    setTo(draftTo);
    setPage(1);
  };

  const columns: DataTableColumn<SaleLineRow>[] = [
    {
      key: "item",
      header: t("item"),
      render: (r) => <span className="font-medium text-text">{r.item}</span>,
    },
    {
      key: "date",
      header: t("salesDate"),
      render: (r) => formatDate(r.salesDate),
    },
    { key: "cashier", header: t("cashier"), render: (r) => r.cashier },
    { key: "payment", header: t("payment"), render: (r) => r.payment },
    {
      key: "unitPrice",
      header: t("unitPrice"),
      className: "tabular-nums",
      render: (r) => formatMoney(r.unitPrice),
    },
    {
      key: "quantity",
      header: t("quantity"),
      className: "tabular-nums",
      render: (r) => r.quantity,
    },
    {
      key: "lineTotal",
      header: t("totalPrice"),
      className: "tabular-nums",
      render: (r) => formatMoney(r.lineTotal),
    },
    ...(canSeeCost
      ? [
          {
            key: "netProfit",
            header: t("netProfit"),
            className: "tabular-nums",
            render: (r: SaleLineRow) => {
              const profit = Number(r.netProfit ?? 0);
              return (
                <span className={profit >= 0 ? "text-success" : "text-danger"}>
                  {formatMoney(r.netProfit ?? "0")}
                </span>
              );
            },
          },
        ]
      : []),
    {
      key: "proof",
      header: t("proof"),
      render: (r) =>
        r.attachments.length > 0 ? (
          <ul className="flex flex-wrap gap-1">
            {r.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={a.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block size-10 overflow-hidden rounded border border-border"
                  aria-label="View payment proof"
                >
                  <Image
                    src={a.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <DateRangeFilter
        from={draftFrom}
        to={draftTo}
        onFromChange={setDraftFrom}
        onToChange={setDraftTo}
        onApply={handleApplyDates}
      />
      {dateError ? (
        <p className="text-sm text-danger">{dateError}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label={t("category")}
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("allCategories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          label={t("product")}
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("allProducts")}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      <ExportMenu
        basePath="sales/export"
        queryParams={{
          from: from || undefined,
          to: to || undefined,
          productId: productId || undefined,
          categoryId: categoryId || undefined,
        }}
      />

      <DataTable
        columns={columns}
        rows={lineRows}
        rowKey={(r) => r.rowKey}
        footer={{
          label: "Page subtotal",
          cells: {
            lineTotal: formatMoney(String(pageSubtotals.lineTotal)),
            ...(canSeeCost
              ? {
                  netProfit: formatMoney(String(pageSubtotals.netProfit)),
                }
              : {}),
          },
        }}
        emptyMessage={t("noSales")}
        mobileCard={(r) => {
          const profit = Number(r.netProfit ?? 0);
          return (
            <div className="text-sm">
              <div className="flex justify-between gap-2">
                <p className="font-medium text-text">{r.item}</p>
                <p className="font-semibold tabular-nums text-primary">
                  {formatMoney(r.lineTotal)}
                </p>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {formatDate(r.salesDate)} · {r.cashier} · {r.payment}
              </p>
              <p className="mt-2 text-xs text-text-muted">
                {r.quantity} × {formatMoney(r.unitPrice)}
                {canSeeCost ? (
                  <>
                    {" "}
                    · Profit{" "}
                    <span
                      className={
                        profit >= 0 ? "text-success" : "text-danger"
                      }
                    >
                      {formatMoney(r.netProfit ?? "0")}
                    </span>
                  </>
                ) : null}
              </p>
              {r.attachments.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {r.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={a.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="relative block size-12 overflow-hidden rounded-lg border border-border">
                          <Image
                            src={a.imageUrl}
                            alt="Proof"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        }}
      />

      <footer className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <PageSizeSelect
          value={pageSize}
          options={[15, 30, 50]}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      </footer>
    </section>
  );
}
