"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  canDeactivateProduct,
  canEditProduct,
  canRestockProduct,
} from "@/lib/product-permissions";
import type { MartProduct } from "@/components/ProductCard";

type Props = {
  product: MartProduct;
  permissions: string[];
  onRestock?: (product: MartProduct) => void;
  onDeactivate?: (productId: string) => void;
};

export const ProductActionsMenu = ({
  product,
  permissions,
  onRestock,
  onDeactivate,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const showEdit = canEditProduct(permissions);
  const showRestock = canRestockProduct(permissions) && Boolean(onRestock);
  const showDeactivate = canDeactivateProduct(permissions) && Boolean(onDeactivate);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!showEdit && !showRestock && !showDeactivate) return null;

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="tap rounded-xl border border-white/15 bg-white/5 px-2.5 py-2 text-sm font-semibold text-white/80"
          aria-label="More actions"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          ⋮
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute bottom-full right-0 z-50 mb-1 min-w-[10rem] rounded-xl border border-white/10 bg-[color:var(--surface)] py-1 shadow-xl"
          >
            {showEdit ? (
              <Link
                href={`/products/${product.id}/edit`}
                role="menuitem"
                className="block px-4 py-2 text-sm text-white/80 hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                Edit
              </Link>
            ) : null}
            {showRestock ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full px-4 py-2 text-left text-sm text-[var(--accent)] hover:bg-white/5"
                onClick={() => {
                  setOpen(false);
                  onRestock?.(product);
                }}
              >
                Restock
              </button>
            ) : null}
            {showDeactivate ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full px-4 py-2 text-left text-sm text-rose-200 hover:bg-white/5"
                onClick={() => {
                  setOpen(false);
                  setConfirmDeactivate(true);
                }}
              >
                Deactivate
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate product"
        message={`"${product.name}" will be hidden from the catalog. You can reactivate it later by editing the product.`}
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={() => onDeactivate?.(product.id)}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </>
  );
};
