"use client";

import Image from "next/image";

type Props = {
  proofPreviews: string[];
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
  onRemove: (index: number) => void;
};

export const PaymentProofUpload = ({
  proofPreviews,
  uploading,
  onUpload,
  onRemove,
}: Props) => {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-white/80">Payment proof</p>
        <p className="mt-0.5 text-xs text-white/50">
          Attach a screenshot of mobile payment (Telebirr, bank transfer, etc.)
        </p>
      </div>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        disabled={uploading}
        onChange={(e) => onUpload(e.target.files)}
        className="w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-yellow)]/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--accent)]"
        aria-label="Upload payment proof"
      />
      {uploading ? <p className="text-xs text-white/50">Uploading…</p> : null}
      {proofPreviews.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {proofPreviews.map((url, index) => (
            <li
              key={url}
              className="group relative h-16 w-16 overflow-hidden rounded-lg border border-white/10"
            >
              <Image src={url} alt="Payment proof" fill className="object-cover" unoptimized />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
                aria-label="Remove attachment"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
