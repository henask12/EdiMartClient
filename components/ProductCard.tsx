"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatBirr } from "@/lib/format-price";
import {
  canDeactivateProduct,
  canEditProduct,
  canReserveProduct,
  canRestockProduct,
  canSellProduct,
} from "@/lib/product-permissions";

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
  permissions: string[];
  onSell: (product: MartProduct) => void;
  onReserve: (product: MartProduct) => void;
  onRestock?: (product: MartProduct) => void;
  onDeactivate?: (productId: string) => void;
};

export const ProductCard = ({
  product,
  permissions,
  onSell,
  onReserve,
  onRestock,
  onDeactivate,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const onHand = Number(product.onHand);
  const available = Number(product.available);
  const low = available <= product.restockAt && available > 0;
  const out = available <= 0;

  const showEdit = canEditProduct(permissions);
  const showSell = canSellProduct(permissions);
  const showReserve = canReserveProduct(permissions);
  const showRestock = canRestockProduct(permissions) && Boolean(onRestock);
  const showDeactivate = canDeactivateProduct(permissions) && Boolean(onDeactivate);

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border bg-[color:var(--surface)]/90 transition hover:border-white/20 ${
        out ? "border-rose-500/30" : low ? "border-amber-500/25" : "border-white/10"
      } ${expanded ? "min-h-0" : "min-h-[320px]"}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="tap flex flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        aria-expanded={expanded}
        aria-label={expanded ? `Collapse ${product.name}` : `View details for ${product.name}`}
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

        <div className="flex flex-1 flex-col p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-2)]">
            {product.productType?.name ?? "—"} · {product.category.name}
          </p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold text-white">{product.name}</h3>
          {!expanded && product.description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/55">
              {product.description}
            </p>
          ) : null}
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
          <p className="mt-2 text-[10px] font-medium text-[var(--accent-2)]">
            {expanded ? "Tap to collapse" : "Tap for details & actions"}
          </p>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-white/10 bg-black/20 px-4 pb-4 pt-3">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-white/70">
            {product.sku ? (
              <>
                <dt className="text-white/45">SKU</dt>
                <dd>{product.sku}</dd>
              </>
            ) : null}
            {product.originCountry ? (
              <>
                <dt className="text-white/45">Origin</dt>
                <dd>{product.originCountry}</dd>
              </>
            ) : null}
            <dt className="text-white/45">Cost</dt>
            <dd className="tabular-nums">{formatBirr(product.costPrice ?? "0")}</dd>
            <dt className="text-white/45">Restock at</dt>
            <dd className="tabular-nums">{product.restockAt}</dd>
            {product.restockQty ? (
              <>
                <dt className="text-white/45">Restock qty</dt>
                <dd className="tabular-nums">{product.restockQty}</dd>
              </>
            ) : null}
            <dt className="text-white/45">Reserved</dt>
            <dd className="tabular-nums">{product.reserved}</dd>
          </dl>
          {product.description ? (
            <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-white/60">
              {product.description}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {showEdit ? (
              <Link
                href={`/products/${product.id}/edit`}
                className="tap rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white"
              >
                Edit details
              </Link>
            ) : null}
            {showSell ? (
              <button
                type="button"
                onClick={() => onSell(product)}
                disabled={available <= 0}
                className="tap btn-primary rounded-xl px-3 py-2 text-xs disabled:opacity-40"
              >
                Sell
              </button>
            ) : null}
            {showReserve ? (
              <button
                type="button"
                onClick={() => onReserve(product)}
                disabled={available <= 0}
                className="tap rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                Reserve
              </button>
            ) : null}
            {showRestock ? (
              <button
                type="button"
                onClick={() => onRestock?.(product)}
                className="tap rounded-xl border border-[var(--brand-yellow)]/30 bg-[var(--brand-yellow)]/10 px-3 py-2 text-xs font-semibold text-[var(--accent)]"
              >
                Restock
              </button>
            ) : null}
            {showDeactivate ? (
              <button
                type="button"
                onClick={() => onDeactivate?.(product.id)}
                className="tap rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-200"
              >
                Deactivate
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
};
