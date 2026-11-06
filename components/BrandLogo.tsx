"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
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
  size = "md",
  linked = false,
  className = "",
}: Props) => {
  const dim = sizes[size];
  const image = (
    <Image
      src="/logo.png"
      alt="Edi's Collection"
      width={dim.w}
      height={dim.h}
      className={`${dim.className} object-contain ${className}`}
      priority
    />
  );

  if (linked) {
    return (
      <Link href="/dashboard" className="inline-flex shrink-0 rounded-lg focus-ring">
        {image}
      </Link>
    );
  }

  return image;
};

export const BrandName = ({ className = "" }: { className?: string }) => (
  <span className={`font-semibold tracking-tight text-text ${className}`}>
    Edi&apos;s Collection
  </span>
);
