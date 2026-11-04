import { redirect } from "next/navigation";

/** Legacy Sell screen — Phase 4 POS lives at `/pos`. */
export default function SellRedirectPage() {
  redirect("/pos");
}
