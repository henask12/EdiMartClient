"use client";

import Image from "next/image";
import {
  canReserveProduct,
  canSellProduct,
} from "@/lib/product-permissions";
import { formatBirr } from "@/lib/format-price";
import { ProductActionsMenu } from "@/components/ProductActionsMenu";

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
  onOpenDetail: (product: MartProduct) => void;
  onSell: (product: MartProduct) => void;
  onReserve: (product: MartProduct) => void;
  onRestock?: (product: MartProduct) => void;
  onDeactivate?: (productId: string) => void;
};

export const ProductCard = ({
  product,
  permissions,
  onOpenDetail,
  onSell,
  onReserve,
  onRestock,
  onDeactivate,
}: Props) => {
  const onHand = Number(product.onHand);
  const available = Number(product.available);
  const low = available <= product.restockAt && available > 0;
  const out = available <= 0;

  const showSell = canSellProduct(permissions);
  const showReserve = canReserveProduct(permissions);

  return (
    <article
      className={`flex flex-col rounded-2xl border bg-[color:var(--surface)]/90 transition hover:border-white/20 ${
        out ? "border-rose-500/30" : low ? "border-amber-500/25" : "border-white/10"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpenDetail(product)}
        className="tap flex flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        aria-label={`View details for ${product.name}`}
      >
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden rounded-t-2xl bg-black/40">
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
        </div>
      </button>

      <div className="relative z-10 flex items-center gap-2 border-t border-white/10 p-3">
        {showSell ? (
          <button
            type="button"
            onClick={() => onSell(product)}
            disabled={available <= 0}
            className="tap btn-primary flex-1 rounded-xl px-3 py-2 text-xs disabled:opacity-40"
          >
            Sell
          </button>
        ) : null}
        {showReserve ? (
          <button
            type="button"
            onClick={() => onReserve(product)}
            disabled={available <= 0}
            className="tap flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            Reserve
          </button>
        ) : null}
        <ProductActionsMenu
          product={product}
          permissions={permissions}
          onRestock={onRestock}
          onDeactivate={onDeactivate}
        />
      </div>
    </article>
  );
};
