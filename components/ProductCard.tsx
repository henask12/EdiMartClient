"use client";

import Image from "next/image";
import { formatBirr } from "@/lib/format-price";

export type MartProduct = {
  id: string;
  name: string;
  sellingPrice: string;
  costPrice?: string;
  description?: string | null;
  originCountry?: string | null;
  onHand: string;
  available: string;
  reserved: string;
  restockAt: number;
  restockQty?: number;
  imageUrl: string | null;
  category: { id: string; name: string };
};

type Props = {
  product: MartProduct;
  onSell: (product: MartProduct) => void;
  onReserve: (product: MartProduct) => void;
  onRestock?: (product: MartProduct) => void;
};

export const ProductCard = ({ product, onSell, onReserve, onRestock }: Props) => {
  const onHand = Number(product.onHand);
  const available = Number(product.available);
  const low = available <= product.restockAt;
  const out = available <= 0;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border bg-[color:var(--surface)]/90 transition hover:border-white/20 ${
        out ? "border-rose-500/30" : low ? "border-amber-500/25" : "border-white/10"
      }`}
    >
      <div className="relative aspect-[4/3] bg-black/40">
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
            Out
          </span>
        ) : low ? (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase text-black">
            Low
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-2)]">
          {product.category.name}
        </p>
        <h3 className="mt-1 line-clamp-2 text-base font-semibold text-white">{product.name}</h3>
        {product.originCountry ? (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-white/45">
            {product.originCountry}
          </p>
        ) : null}
        {product.description ? (
          <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-white/55">
            {product.description}
          </p>
        ) : null}
        <p className="mt-2 text-lg font-semibold tabular-nums text-[var(--accent)]">
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
              {product.restockQty ? ` (+${product.restockQty} suggested)` : ""}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
};
