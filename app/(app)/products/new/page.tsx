"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CategorySelect } from "@/components/CategorySelect";
import { DateInput } from "@/components/DateInput";
import { parseApiMessage, toastError } from "@/lib/toast";

export default function NewProductPage() {
  const router = useRouter();
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
          costPrice: costPrice || "0",
          restockAt: Number(restockAt),
          restockQty: Number(restockQty),
          imagePath,
          description: description.trim() || undefined,
          originCountry: originCountry.trim() || undefined,
          initialQuantity: hasOpeningStock ? initialQuantity : undefined,
          initialExpiryDate: hasOpeningStock && expiryDate ? expiryDate : undefined,
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
      <div>
        <h1 className="text-2xl font-semibold text-white">Add product</h1>
        <p className="mt-2 text-sm text-white/60">
          Set up the product and opening stock in one step.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-white/10 bg-[color:var(--surface)]/80 p-6"
      >
        <CategorySelect value={categoryId} onChange={setCategoryId} allowCreate />
        <label className="block text-sm text-white/70">
          Product name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sugar 1kg"
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block text-sm text-white/70">
          Listing details (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder={"✨ Absorbs gunk in 6–8 hours\n✨ Suitable for sensitive skin\n1 pack · 12 pcs"}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block text-sm text-white/70">
          Origin (optional)
          <input
            value={originCountry}
            onChange={(e) => setOriginCountry(e.target.value)}
            placeholder="e.g. USA 🇺🇸"
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block text-sm text-white/70">
          Photo (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="mt-2 w-full text-sm text-white/70"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-white/70">
            Sell price
            <input
              required
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Cost each
            <input
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
        </div>

        <section className="rounded-xl border border-[var(--brand-yellow)]/20 bg-[var(--brand-yellow)]/5 p-4">
          <h2 className="text-sm font-semibold text-[var(--accent)]">Opening stock</h2>
          <p className="mt-1 text-xs text-white/50">Recorded in stock history automatically.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm text-white/70">
              Quantity
              <input
                type="number"
                min={0}
                step="any"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                placeholder="0"
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <DateInput
              label="Expiry (optional)"
              value={expiryDate}
              onChange={setExpiryDate}
              required={false}
            />
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h2 className="text-sm font-semibold text-white/80">Restock alerts</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm text-white/70">
              Alert when below
              <input
                type="number"
                min={0}
                required
                value={restockAt}
                onChange={(e) => setRestockAt(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-white/70">
              Suggested reorder qty
              <input
                type="number"
                min={0}
                required
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
            </label>
          </div>
        </section>

        <button
          type="submit"
          disabled={loading || !categoryId}
          className="tap btn-primary w-full px-4 py-3 text-sm"
        >
          {loading ? "Saving…" : "Save product & stock"}
        </button>
      </form>
    </div>
  );
}
