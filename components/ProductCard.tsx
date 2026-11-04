"use client";

import Image from "next/image";
import {
  canReserveProduct,
  canSellProduct,
} from "@/lib/product-permissions";
import { formatMoney } from "@/lib/format-money";
import { ProductActionsMenu } from "@/components/ProductActionsMenu";
import { Button } from "@/components/ui/Button";

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
      className={`flex flex-col rounded-2xl border bg-surface transition hover:border-primary/30 ${
        out ? "border-danger/30" : low ? "border-warning/25" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpenDetail(product)}
        className="tap flex flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`View details for ${product.name}`}
      >
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden rounded-t-2xl bg-surface-muted">
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
            <div className="flex h-full min-h-[120px] items-center justify-center text-4xl text-text-muted/30">
              ◆
            </div>
          )}
          {out ? (
            <span className="absolute left-2 top-2 rounded-full bg-danger/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              OUT of Stock
            </span>
          ) : low ? (
            <span className="absolute left-2 top-2 rounded-full bg-warning/90 px-2 py-0.5 text-[10px] font-bold uppercase text-black">
              Low
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            {product.productType?.name ?? "—"} · {product.category.name}
          </p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold text-text">
            {product.name}
          </h3>
          <p className="mt-auto pt-2 text-lg font-semibold tabular-nums text-accent">
            {formatMoney(product.sellingPrice)}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            <span className="tabular-nums">{onHand}</span> on hand ·{" "}
            <span className="tabular-nums text-text">{available}</span>{" "}
            available
            {Number(product.reserved) > 0 ? (
              <span className="text-warning"> · {product.reserved} reserved</span>
            ) : null}
          </p>
        </div>
      </button>

      <div className="relative z-10 flex items-center gap-2 border-t border-border p-3">
        {showSell ? (
          <Button
            type="button"
            size="sm"
            onClick={() => onSell(product)}
            disabled={available <= 0}
            className="flex-1"
          >
            Sell
          </Button>
        ) : null}
        {showReserve ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onReserve(product)}
            disabled={available <= 0}
            className="flex-1"
          >
            Reserve
          </Button>
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
