"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ProductImage } from "@/components/ProductImage";
import { cn } from "@/lib/cn";

type Props = {
  /** Existing product image URL from the API (edit form). */
  currentUrl?: string | null;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  error?: string;
  className?: string;
};

/** Photo picker with live preview; stores the file for upload on save. */
export const ProductPhotoField = ({
  currentUrl,
  file,
  onChange,
  required,
  error,
  className,
}: Props) => {
  const t = useTranslations("Products");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const displayUrl = previewUrl ?? currentUrl ?? null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-text-muted">
          {currentUrl ? t("newPhoto") : t("photo")}
          {required ? (
            <span className="text-danger" aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </span>
        {file ? (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => onChange(null)}
          >
            {t("photoClear")}
          </button>
        ) : null}
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border">
        {previewUrl ? (
          // Local blob URL — plain <img> (next/image does not accept object URLs).
          <img
            src={previewUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <ProductImage
            imageUrl={displayUrl}
            alt=""
            className="absolute inset-0 h-full w-full"
            iconClassName="size-12"
            sizes="400px"
          />
        )}
      </div>

      <label className="block">
        <span className="sr-only">{t("photoChoose")}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          required={required && !currentUrl && !file}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "product-photo-error" : "product-photo-hint"}
        />
      </label>
      <p id="product-photo-hint" className="text-xs text-text-muted">
        {t("photoHint")}
      </p>
      {error ? (
        <p id="product-photo-error" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
};
