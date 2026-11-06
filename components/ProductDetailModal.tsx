"use client";

import { formatMoney } from "@/lib/format-money";
import type { MartProduct } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";

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
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3]">
          <ProductImage
            imageUrl={product.imageUrl}
            alt={product.name}
            className="absolute inset-0 h-full w-full"
            iconClassName="size-14"
            sizes="400px"
          />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                {product.category.name}
              </p>
              <h2 id="product-detail-title" className="mt-1 text-xl font-semibold text-text">
                {product.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-border px-3 py-1 text-sm text-text-muted"
              aria-label="Close"
            >
              Close
            </button>
          </div>

          <p className="mt-3 text-2xl font-semibold tabular-nums text-accent">
            {formatMoney(product.sellingPrice)}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-text-muted">
            {product.originCountry ? (
              <>
                <dt className="text-text-muted">Origin</dt>
                <dd>{product.originCountry}</dd>
              </>
            ) : null}
            <dt className="text-text-muted">Available</dt>
            <dd className="tabular-nums">{product.available}</dd>
          </dl>

          {product.description ? (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-text-muted">
              {product.description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
