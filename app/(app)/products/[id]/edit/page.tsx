"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CategorySelect } from "@/components/CategorySelect";
import { DateInput } from "@/components/DateInput";
import { usePermission } from "@/components/PermissionProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { parseApiMessage, toastError } from "@/lib/toast";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canSeeCost } = usePermission();
  const t = useTranslations("Products");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [nameAm, setNameAm] = useState("");
  const [brand, setBrand] = useState("");
  const [barcode, setBarcode] = useState("");
  const [trackBatches, setTrackBatches] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [restockAt, setRestockAt] = useState("0");
  const [restockQty, setRestockQty] = useState("0");
  const [minStock, setMinStock] = useState("0");
  const [maxStock, setMaxStock] = useState("0");
  const [description, setDescription] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState("");

  useEffect(() => {
    const load = async () => {
      const prodRes = await fetch(`/api/proxy/products/${id}`, {
        cache: "no-store",
      });
      if (!prodRes.ok) {
        toastError("Product not found");
        return;
      }
      const p = (await prodRes.json()) as {
        name: string;
        nameAm?: string | null;
        brand?: string | null;
        trackBatches?: boolean;
        minStock?: number;
        maxStock?: number;
        categoryId: string;
        sellingPrice: string;
        costPrice?: string;
        restockAt: number;
        restockQty: number;
        description?: string | null;
        originCountry?: string | null;
        expiryDate?: string | null;
        barcodes?: Array<{ barcode: string; isPrimary: boolean }>;
      };
      setName(p.name);
      setNameAm(p.nameAm ?? "");
      setBrand(p.brand ?? "");
      setTrackBatches(Boolean(p.trackBatches));
      setMinStock(String(p.minStock ?? 0));
      setMaxStock(String(p.maxStock ?? 0));
      setCategoryId(p.categoryId);
      setSellingPrice(p.sellingPrice);
      setCostPrice(p.costPrice ?? "");
      setRestockAt(String(p.restockAt));
      setRestockQty(String(p.restockQty));
      setDescription(p.description ?? "");
      setOriginCountry(p.originCountry ?? "");
      setExpiryDate(
        p.expiryDate ? new Date(p.expiryDate).toISOString().slice(0, 10) : "",
      );
      const primary = p.barcodes?.find((b) => b.isPrimary) ?? p.barcodes?.[0];
      setBarcode(primary?.barcode ?? "");
    };
    void load();
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imagePath: string | undefined;
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const up = await fetch("/api/proxy/uploads/product-image", {
          method: "POST",
          body: fd,
        });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) {
          toastError(parseApiMessage(upData, "Image upload failed"));
          return;
        }
        imagePath = upData.path as string;
      }
      const res = await fetch(`/api/proxy/products/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          nameAm: nameAm.trim() || null,
          brand: brand.trim() || null,
          barcode: barcode.trim() || undefined,
          trackBatches: trackBatches || Boolean(expiryDate),
          categoryId,
          sellingPrice,
          ...(canSeeCost ? { costPrice: costPrice || "0" } : {}),
          restockAt: Number(restockAt),
          restockQty: Number(restockQty),
          minStock: Number(minStock) || 0,
          maxStock: Number(maxStock) || 0,
          imagePath,
          description: description.trim() || null,
          originCountry: originCountry.trim() || null,
          expiryDate: expiryDate || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(parseApiMessage(data, "Could not save"));
        return;
      }
      router.push("/products");
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/products" className="text-sm text-primary">
        ← {t("products")}
      </Link>
      <PageHeader title={t("editProduct")} />
      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <div className="space-y-4">
            <CategorySelect
              value={categoryId}
              onChange={setCategoryId}
              allowCreate
            />
            <Input
              required
              label={t("name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Amharic name"
              value={nameAm}
              onChange={(e) => setNameAm(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
              <Input
                label="Barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={trackBatches || Boolean(expiryDate)}
                onChange={(e) => setTrackBatches(e.target.checked)}
                className="size-4"
              />
              Track batches and expiry (FEFO)
            </label>
            <label className="block text-sm text-text-muted">
              {t("description")}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-text outline-none focus:border-primary"
              />
            </label>
            <Input
              label={t("origin")}
              value={originCountry}
              onChange={(e) => setOriginCountry(e.target.value)}
            />
            <label className="block text-sm text-text-muted">
              {t("newPhoto")}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="mt-2 w-full text-sm text-text-muted"
              />
            </label>
            <DateInput
              label={t("expiryOptional")}
              value={expiryDate}
              onChange={setExpiryDate}
            />
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                required
                label={t("sellPrice")}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
              {canSeeCost ? (
                <Input
                  label={t("cost")}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                />
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={0}
                label={t("alertWhenBelow")}
                value={restockAt}
                onChange={(e) => setRestockAt(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                label={t("suggestedReorder")}
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                label="Min stock"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                label="Max stock"
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Button type="submit" disabled={loading} fullWidth>
          {loading ? t("saving") : t("saveChanges")}
        </Button>
      </form>
    </div>
  );
}
