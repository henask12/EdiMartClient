"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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

/** Always reserves an image slot; shows a calm placeholder when none is set or load fails. */
export const ProductImage = ({
  imageUrl,
  alt,
  className,
  iconClassName = "size-10",
  sizes = "(max-width: 640px) 50vw, 25vw",
  priority,
}: Props) => {
  const src = productImageSrc(imageUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const showImage = !!src && !failed;

  return (
    <div className={cn("relative overflow-hidden bg-surface-muted", className)}>
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes={sizes}
          unoptimized
          priority={priority}
          onError={() => setFailed(true)}
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
