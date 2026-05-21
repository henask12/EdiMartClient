"use client";

import Image from "next/image";
import { formatBirr } from "@/lib/format-price";
import type { MartProduct } from "@/components/ProductCard";

type Props = {
  product: MartProduct | null;
  onClose: () => void;
};

export const ProductDetailModal = ({ product, onClose }: Props) => {
  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[color:var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3] bg-black/40">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="400px"
              unoptimized
            />
          ) : (
            <div className="flex h-full min-h-[160px] items-center justify-center text-5xl text-white/20">
              ◆
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-2)]">
                {product.category.name}
              </p>
              <h2 id="product-detail-title" className="mt-1 text-xl font-semibold text-white">
                {product.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-white/15 px-3 py-1 text-sm text-white/70"
              aria-label="Close"
            >
              Close
            </button>
          </div>

          <p className="mt-3 text-2xl font-semibold tabular-nums text-[var(--accent)]">
            {formatBirr(product.sellingPrice)}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-white/70">
            {product.originCountry ? (
              <>
                <dt className="text-white/45">Origin</dt>
                <dd>{product.originCountry}</dd>
              </>
            ) : null}
            <dt className="text-white/45">Available</dt>
            <dd className="tabular-nums">{product.available}</dd>
          </dl>

          {product.description ? (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/60">
              {product.description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
