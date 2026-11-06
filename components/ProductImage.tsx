"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { productImageSrc } from "@/lib/api";
import { cn } from "@/lib/cn";

type Props = {
  imageUrl?: string | null;
  alt: string;
  className?: string;
  /** Tailwind classes for the empty-state icon size. */
  iconClassName?: string;
  sizes?: string;
  priority?: boolean;
};

/** Always reserves an image slot; shows a calm placeholder when none is set. */
export const ProductImage = ({
  imageUrl,
  alt,
  className,
  iconClassName = "size-10",
  sizes = "(max-width: 640px) 50vw, 25vw",
  priority,
}: Props) => {
  const src = productImageSrc(imageUrl);

  return (
    <div className={cn("relative overflow-hidden bg-surface-muted", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes={sizes}
          unoptimized
          priority={priority}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-text-muted/35"
          aria-hidden
        >
          <Package className={iconClassName} strokeWidth={1.25} />
        </div>
      )}
    </div>
  );
};
