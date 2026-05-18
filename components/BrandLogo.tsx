"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  /** Yellow-bg logo on dark UI; light-bg logo on pale surfaces */
  variant?: "on-dark" | "on-light";
  size?: "sm" | "md" | "lg";
  linked?: boolean;
  className?: string;
};

const sizes = {
  sm: { w: 128, h: 44, className: "h-9 w-auto max-w-[128px]" },
  md: { w: 160, h: 56, className: "h-11 w-auto max-w-[160px]" },
  lg: { w: 220, h: 76, className: "h-16 w-auto max-w-[220px]" },
} as const;

export const BrandLogo = ({
  variant = "on-dark",
  size = "md",
  linked = false,
  className = "",
}: Props) => {
  const src = variant === "on-dark" ? "/logo.png" : "/logo-light.png";
  const dim = sizes[size];

  const image = (
    <Image
      src={src}
      alt="Edi's Collection"
      width={dim.w}
      height={dim.h}
      className={`${dim.className} object-contain ${className}`}
      priority
    />
  );

  if (linked) {
    return (
      <Link href="/dashboard" className="inline-flex shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
        {image}
      </Link>
    );
  }

  return image;
};

export const BrandName = ({ className = "" }: { className?: string }) => (
  <span className={`font-semibold tracking-tight text-white ${className}`}>
    Edi&apos;s Collection
  </span>
);
