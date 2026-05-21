"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CategorySelect } from "@/components/CategorySelect";
import { DateInput } from "@/components/DateInput";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
      const prodRes = await fetch(`/api/proxy/products/${id}`, { cache: "no-store" });
      if (!prodRes.ok) {
        setError("Product not found");
        return;
      }
      const p = (await prodRes.json()) as {
        name: string;
        categoryId: string;
        sellingPrice: string;
        costPrice: string;
        restockAt: number;
        restockQty: number;
        description?: string | null;
        originCountry?: string | null;
        expiryDate?: string | null;
      };
      setName(p.name);
      setCategoryId(p.categoryId);
      setSellingPrice(p.sellingPrice);
      setCostPrice(p.costPrice);
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
    setError(null);
    try {
      let imagePath: string | undefined;
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const up = await fetch("/api/proxy/uploads/product-image", { method: "POST", body: fd });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) {
          setError(upData.message ?? "Image upload failed");
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
          costPrice: costPrice || "0",
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
        setError(Array.isArray(data.message) ? data.message.join(", ") : data.message ?? "Could not save");
        return;
      }
      router.push("/products");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/products" className="text-sm text-[var(--accent-2)]">
          ← Products
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Edit product</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-6">
        <CategorySelect value={categoryId} onChange={setCategoryId} allowCreate />
        <label className="block text-sm text-white/70">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-white/70">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-white/70">
          Origin
          <input
            value={originCountry}
            onChange={(e) => setOriginCountry(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-white/70">
          New photo (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="mt-2 w-full text-sm text-white/70"
          />
        </label>
        <DateInput
          label="Expiry (optional)"
          value={expiryDate}
          onChange={setExpiryDate}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-white/70">
            Sell price
            <input
              required
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="text-sm text-white/70">
            Cost
            <input
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-white/70">
            Alert below
            <input
              type="number"
              min={0}
              value={restockAt}
              onChange={(e) => setRestockAt(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="text-sm text-white/70">
            Reorder qty
            <input
              type="number"
              min={0}
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
        </div>
        {error ? <p className="text-sm text-rose-200">{error}</p> : null}
        <button type="submit" disabled={loading} className="tap btn-primary w-full py-3 text-sm">
          {loading ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
