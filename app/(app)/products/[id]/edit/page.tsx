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
  const [categoryId, setCategoryId] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [restockAt, setRestockAt] = useState("0");
  const [restockQty, setRestockQty] = useState("0");
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
        categoryId: string;
        sellingPrice: string;
        costPrice?: string;
        restockAt: number;
        restockQty: number;
        description?: string | null;
        originCountry?: string | null;
        expiryDate?: string | null;
      };
      setName(p.name);
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
          categoryId,
          sellingPrice,
          ...(canSeeCost ? { costPrice: costPrice || "0" } : {}),
          restockAt: Number(restockAt),
          restockQty: Number(restockQty),
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
