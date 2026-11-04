"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { usePermission } from "@/components/PermissionProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import {
  getPurchaseOrder,
  listLocations,
  listProducts,
  postGoodsReceipt,
  postLandedCosts,
  type LocationOption,
  type ProductOption,
  type PurchaseOrder,
} from "@/lib/purchasing";
import { toastError, toastSuccess } from "@/lib/toast";

type ReceiveLine = {
  key: string;
  purchaseOrderLineId?: string;
  productId: string;
  productName: string;
  quantity: string;
  unitCost: string;
  locationId: string;
  expiryDate: string;
  lotNumber: string;
  remaining?: string;
};

const GoodsReceiveInner = () => {
  const t = useTranslations("Purchasing");
  const search = useSearchParams();
  const router = useRouter();
  const { canSeeCost } = usePermission();
  const poId = search.get("poId") ?? "";

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [notes, setNotes] = useState("");
  const [scan, setScan] = useState("");
  const [posting, setPosting] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [landedKind, setLandedKind] = useState("TRANSPORT");
  const [landedAmount, setLandedAmount] = useState("");
  const [landedBy, setLandedBy] = useState("VALUE");
  const [applyingLanded, setApplyingLanded] = useState(false);

  const defaultLocationId = useMemo(
    () => locations.find((l) => l.sellable)?.id ?? locations[0]?.id ?? "",
    [locations],
  );

  const load = useCallback(async () => {
    if (!poId) return;
    try {
      const [order, locs, prods] = await Promise.all([
        getPurchaseOrder(poId),
        listLocations(),
        listProducts(),
      ]);
      setPo(order);
      setLocations(locs);
      setProducts(prods);
      const loc = locs.find((l) => l.sellable)?.id ?? locs[0]?.id ?? "";
      setLines(
        (order.lines ?? [])
          .map((line) => {
            const ordered = Number(line.quantityOrdered);
            const received = Number(line.quantityReceived);
            const remaining = Math.max(0, ordered - received);
            if (remaining <= 0) return null;
            return {
              key: line.id,
              purchaseOrderLineId: line.id,
              productId: line.productId,
              productName: line.product?.name ?? line.productId,
              quantity: String(remaining),
              unitCost: line.unitCost ?? "0",
              locationId: loc,
              expiryDate: "",
              lotNumber: "",
              remaining: String(remaining),
            } satisfies ReceiveLine;
          })
          .filter(Boolean) as ReceiveLine[],
      );
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not load PO");
    }
  }, [poId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleScanAdd = () => {
    const q = scan.trim().toLowerCase();
    if (!q) return;
    const match =
      products.find((p) => p.sku?.toLowerCase() === q) ??
      products.find((p) => p.name.toLowerCase().includes(q)) ??
      (po?.lines ?? [])
        .map((l) => l.product)
        .find((p) => p && (p.sku?.toLowerCase() === q || p.name.toLowerCase().includes(q)));

    const productId = match && "id" in match ? match.id : undefined;
    if (!productId) {
      toastError("No product matched");
      return;
    }

    const poLine = (po?.lines ?? []).find((l) => l.productId === productId);
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId
            ? { ...l, quantity: String(Number(l.quantity) + 1) }
            : l,
        );
      }
      const productName =
        ("name" in (match as ProductOption) ? (match as ProductOption).name : undefined) ??
        poLine?.product?.name ??
        productId;
      return [
        ...prev,
        {
          key: `${productId}-${Date.now()}`,
          purchaseOrderLineId: poLine?.id,
          productId,
          productName,
          quantity: "1",
          unitCost: poLine?.unitCost ?? (match as ProductOption).costPrice ?? "0",
          locationId: defaultLocationId,
          expiryDate: "",
          lotNumber: "",
        },
      ];
    });
    setScan("");
  };

  const handlePost = async () => {
    if (!poId) return;
    const payload = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (payload.length === 0) {
      toastError("Add at least one line");
      return;
    }
    setPosting(true);
    try {
      const receipt = await postGoodsReceipt({
        purchaseOrderId: poId,
        notes: notes.trim() || undefined,
        lines: payload.map((l) => ({
          purchaseOrderLineId: l.purchaseOrderLineId,
          productId: l.productId,
          quantity: l.quantity,
          unitCost: canSeeCost ? l.unitCost || "0" : "0",
          locationId: l.locationId || defaultLocationId,
          expiryDate: l.expiryDate || undefined,
          lotNumber: l.lotNumber || undefined,
        })),
      });
      toastSuccess(`Receipt ${receipt.receiptNumber} posted`);
      setReceiptId(receipt.id);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not post receipt");
    } finally {
      setPosting(false);
    }
  };

  const handleLanded = async () => {
    if (!receiptId || !landedAmount) return;
    setApplyingLanded(true);
    try {
      await postLandedCosts(receiptId, {
        charges: [
          {
            kind: landedKind,
            amount: landedAmount,
            allocateBy: landedBy,
          },
        ],
      });
      toastSuccess("Landed costs applied");
      router.push(`/purchase-orders/${poId}`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not apply landed costs");
    } finally {
      setApplyingLanded(false);
    }
  };

  if (!poId) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("receiveAgainstPo")} description="Open a PO and click Receive." />
        <Link href="/purchase-orders">
          <Button variant="secondary">Purchase orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("receiveAgainstPo")}
        description={
          po ? `${po.poNumber} · ${po.supplier?.name ?? ""}` : t("receiveDescription")
        }
        actions={
          <Link href={`/purchase-orders/${poId}`}>
            <Button variant="secondary">Back to PO</Button>
          </Link>
        }
      />

      {!receiptId ? (
        <>
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Scan / search"
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleScanAdd();
                  }
                }}
                placeholder={t("searchProduct")}
                autoFocus
              />
            </div>
            <Button type="button" variant="secondary" onClick={handleScanAdd}>
              Add
            </Button>
          </Card>

          <div className="space-y-3">
            {lines.map((line) => (
              <Card key={line.key} className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="font-medium text-text">{line.productName}</p>
                  {line.remaining != null ? (
                    <p className="text-xs text-text-muted">Remaining on PO: {line.remaining}</p>
                  ) : null}
                </div>
                <Input
                  label={t("quantity")}
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key ? { ...l, quantity: e.target.value } : l,
                      ),
                    )
                  }
                />
                {canSeeCost ? (
                  <Input
                    label={t("unitCost")}
                    value={line.unitCost}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l) =>
                          l.key === line.key ? { ...l, unitCost: e.target.value } : l,
                        ),
                      )
                    }
                  />
                ) : null}
                <Select
                  label={t("location")}
                  value={line.locationId}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key ? { ...l, locationId: e.target.value } : l,
                      ),
                    )
                  }
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label={t("expiry")}
                  type="date"
                  value={line.expiryDate}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key ? { ...l, expiryDate: e.target.value } : l,
                      ),
                    )
                  }
                />
                <Input
                  label={t("lot")}
                  value={line.lotNumber}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key ? { ...l, lotNumber: e.target.value } : l,
                      ),
                    )
                  }
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Input
            label={t("notes")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Button type="button" onClick={() => void handlePost()} disabled={posting || lines.length === 0}>
            {posting ? "Posting…" : t("postReceipt")}
          </Button>
        </>
      ) : (
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold text-text">{t("landedCost")}</h2>
          <p className="text-sm text-text-muted">{t("landedCostDescription")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="Kind"
              value={landedKind}
              onChange={(e) => setLandedKind(e.target.value)}
            >
              <option value="TRANSPORT">Transport</option>
              <option value="CUSTOMS">Customs</option>
              <option value="CLEARING">Clearing</option>
              <option value="OTHER">Other</option>
            </Select>
            <Input
              label="Amount"
              value={landedAmount}
              onChange={(e) => setLandedAmount(e.target.value)}
            />
            <Select
              label="Allocate by"
              value={landedBy}
              onChange={(e) => setLandedBy(e.target.value)}
            >
              <option value="VALUE">Value</option>
              <option value="QUANTITY">Quantity</option>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void handleLanded()}
              disabled={!landedAmount || applyingLanded}
            >
              {t("applyLanded")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/purchase-orders/${poId}`)}
            >
              Skip
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default function GoodsReceiptNewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <GoodsReceiveInner />
    </Suspense>
  );
}
