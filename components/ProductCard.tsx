"use client";

import Image from "next/image";
import Link from "next/link";
import { CategorySelect } from "@/components/CategorySelect";
import { formatBirr } from "@/lib/format-price";

export type MartProduct = {
  id: string;
  name: string;
  sku?: string | null;
  sellingPrice: string;
  costPrice?: string;
  description?: string | null;
  originCountry?: string | null;
  onHand: string;
  available: string;
  reserved: string;
  restockAt: number;
  restockQty?: number;
  stockStatus?: string;
  imageUrl: string | null;
  category: { id: string; name: string };
  productType?: { id: string; name: string } | null;
};

type Props = {
  product: MartProduct;
  canEdit?: boolean;
  onSell: (product: MartProduct) => void;
  onReserve: (product: MartProduct) => void;
  onRestock?: (product: MartProduct) => void;
  onCategoryChange?: (productId: string, categoryId: string) => void;
};

export const ProductCard = ({
  product,
  canEdit = false,
  onSell,
  onReserve,
  onRestock,
  onCategoryChange,
}: Props) => {
  const onHand = Number(product.onHand);
  const available = Number(product.available);
  const low = available <= product.restockAt && available > 0;
  const out = available <= 0;

  return (
    <article
      className={`flex min-h-[420px] flex-col overflow-hidden rounded-2xl border bg-[color:var(--surface)]/90 transition hover:border-white/20 ${
        out ? "border-rose-500/30" : low ? "border-amber-500/25" : "border-white/10"
      }`}
    >
      <div className="relative aspect-[4/3] shrink-0 bg-black/40">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full min-h-[120px] items-center justify-center text-4xl text-white/20">
            ◆
          </div>
        )}
        {out ? (
          <span className="absolute left-2 top-2 rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            OUT of Stock
          </span>
        ) : low ? (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase text-black">
            Low
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-2)]">
          {product.productType?.name ?? "—"} · {product.category.name}
        </p>
        <h3 className="mt-1 line-clamp-2 text-base font-semibold text-white">{product.name}</h3>
        {product.sku ? (
          <p className="mt-0.5 text-[10px] text-white/40">SKU: {product.sku}</p>
        ) : null}
        {product.originCountry ? (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-white/45">
            {product.originCountry}
          </p>
        ) : null}
        {product.description ? (
          <p className="mt-2 line-clamp-2 whitespace-pre-line text-xs leading-relaxed text-white/55">
            {product.description}
          </p>
        ) : (
          <div className="mt-2 flex-1" />
        )}
        <p className="mt-auto pt-2 text-lg font-semibold tabular-nums text-[var(--accent)]">
          {formatBirr(product.sellingPrice)}
        </p>
        <p className="mt-1 text-xs text-white/55">
          <span className="tabular-nums">{onHand}</span> on hand ·{" "}
          <span className="tabular-nums text-white/80">{available}</span> available
          {Number(product.reserved) > 0 ? (
            <span className="text-amber-200/80"> · {product.reserved} reserved</span>
          ) : null}
        </p>

        <div className="mt-4 space-y-2">
          {canEdit && onCategoryChange ? (
            <CategorySelect
              compact
              allowCreate
              label="Category"
              value={product.category.id}
              onChange={(categoryId) => onCategoryChange(product.id, categoryId)}
            />
          ) : null}
          {canEdit ? (
            <Link
              href={`/products/${product.id}/edit`}
              className="tap block w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-center text-sm font-semibold text-white"
            >
              Edit details
            </Link>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSell(product)}
              disabled={available <= 0}
              className="tap btn-primary rounded-xl px-3 py-2.5 text-sm disabled:opacity-40"
            >
              Sell
            </button>
            <button
              type="button"
              onClick={() => onReserve(product)}
              disabled={available <= 0}
              className="tap rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reserve
            </button>
          </div>
          {onRestock ? (
            <button
              type="button"
              onClick={() => onRestock(product)}
              className="tap w-full rounded-xl border border-[var(--brand-yellow)]/30 bg-[var(--brand-yellow)]/10 px-3 py-2.5 text-sm font-semibold text-[var(--accent)]"
            >
              Restock
              {product.restockQty ? ` (+${product.restockQty})` : ""}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
};
