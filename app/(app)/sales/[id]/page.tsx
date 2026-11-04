"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Deep-link into a sale: bounce to the ledger with the detail sheet opened via query.
 * Detail UI lives in `SaleDetailSheet` on `/sales`.
 */
export default function SaleByIdPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const id = params?.id;
    if (id) router.replace(`/sales?saleId=${encodeURIComponent(id)}`);
    else router.replace("/sales");
  }, [params, router]);

  return (
    <p className="p-6 text-sm text-text-muted">Opening sale…</p>
  );
}
