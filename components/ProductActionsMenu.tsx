"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import {
  canDeactivateProduct,
  canEditProduct,
  canRestockProduct,
} from "@/lib/product-permissions";
import type { MartProduct } from "@/components/ProductCard";
import { MoreVertical, Pencil, Plus, Trash2 } from "@/lib/icons";

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
        <IconButton
          variant="secondary"
          aria-label="More actions"
          aria-expanded={open}
          icon={<MoreVertical />}
          onClick={() => setOpen((v) => !v)}
        />
        {open ? (
          <div
            role="menu"
            className="absolute bottom-full right-0 z-50 mb-1 min-w-[10rem] rounded-[var(--radius-md)] border border-white/10 bg-[color:var(--surface)] py-1 shadow-xl"
          >
            {showEdit ? (
              <Link
                href={`/products/${product.id}/edit`}
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                <Pencil className="size-4" />
                Edit
              </Link>
            ) : null}
            {showRestock ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--accent)] hover:bg-white/5"
                onClick={() => {
                  setOpen(false);
                  onRestock?.(product);
                }}
              >
                <Plus className="size-4" />
                Restock
              </button>
            ) : null}
            {showDeactivate ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-200 hover:bg-white/5"
                onClick={() => {
                  setOpen(false);
                  setConfirmDeactivate(true);
                }}
              >
                <Trash2 className="size-4" />
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
