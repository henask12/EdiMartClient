"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CategorySelect } from "@/components/CategorySelect";
import { DateInput } from "@/components/DateInput";
import { usePermission } from "@/components/PermissionProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { parseApiMessage, toastError } from "@/lib/toast";

export default function NewProductPage() {
  const router = useRouter();
  const { canSeeCost } = usePermission();
  const t = useTranslations("Products");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [restockAt, setRestockAt] = useState("5");
  const [restockQty, setRestockQty] = useState("10");
  const [initialQuantity, setInitialQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [description, setDescription] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

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

      const hasOpeningStock = initialQuantity && Number(initialQuantity) > 0;

      const res = await fetch("/api/proxy/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          categoryId,
          sellingPrice,
          ...(canSeeCost ? { costPrice: costPrice || "0" } : {}),
          restockAt: Number(restockAt),
          restockQty: Number(restockQty),
          imagePath,
          description: description.trim() || undefined,
          originCountry: originCountry.trim() || undefined,
          initialQuantity: hasOpeningStock ? initialQuantity : undefined,
          initialExpiryDate:
            hasOpeningStock && expiryDate ? expiryDate : undefined,
          expiryDate: expiryDate || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(parseApiMessage(data, "Could not save"));
        return;
      }
      router.push("/products");
      router.refresh();
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title={t("addProduct")}
        description={t("addProductDesc")}
      />
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
              label={t("productName")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sugar 1kg"
            />
            <label className="block text-sm text-text-muted">
              {t("listingDetails")}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder={
                  "✨ Absorbs gunk in 6–8 hours\n✨ Suitable for sensitive skin\n1 pack · 12 pcs"
                }
                className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-text outline-none focus:border-primary"
              />
            </label>
            <Input
              label={t("origin")}
              value={originCountry}
              onChange={(e) => setOriginCountry(e.target.value)}
              placeholder="e.g. USA 🇺🇸"
            />
            <label className="block text-sm text-text-muted">
              {t("photo")}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="mt-2 w-full text-sm text-text-muted"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                required
                label={t("sellPrice")}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
              {canSeeCost ? (
                <Input
                  label={t("costEach")}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                />
              ) : null}
            </div>
          </div>
        </Card>

        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
          <h2 className="text-sm font-semibold text-accent">
            {t("openingStock")}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {t("openingStockDesc")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input
              type="number"
              min={0}
              step="any"
              label={t("quantity")}
              value={initialQuantity}
              onChange={(e) => setInitialQuantity(e.target.value)}
              placeholder="0"
            />
            <DateInput
              label={t("expiryOptional")}
              value={expiryDate}
              onChange={setExpiryDate}
              required={false}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <h2 className="text-sm font-semibold text-text">
            {t("restockAlerts")}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input
              type="number"
              min={0}
              required
              label={t("alertWhenBelow")}
              value={restockAt}
              onChange={(e) => setRestockAt(e.target.value)}
            />
            <Input
              type="number"
              min={0}
              required
              label={t("suggestedReorder")}
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading || !categoryId} fullWidth>
          {loading ? t("saving") : t("saveProduct")}
        </Button>
      </form>
    </div>
  );
}
