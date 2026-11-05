import { parseApiMessage } from "@/lib/toast";

export type PromotionType =
  | "PERCENT_OFF"
  | "FIXED_OFF"
  | "MIN_SPEND_PERCENT"
  | "MIN_SPEND_FIXED";

export type PromotionTarget = "ALL" | "PRODUCT" | "CATEGORY";

export type Promotion = {
  id: string;
  name: string;
  code?: string | null;
  type: PromotionType;
  value: string;
  minSpend?: string | null;
  target: PromotionTarget;
  productId?: string | null;
  categoryId?: string | null;
  product?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  startsAt?: string | null;
  endsAt?: string | null;
  daysOfWeek?: number[];
  startHour?: number | null;
  endHour?: number | null;
  priority: number;
  stackable: boolean;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  usageCount?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PromotionEvaluateInput = {
  couponCode?: string;
  customerId?: string;
  lines: Array<{
    productId: string;
    quantity: string;
    unitPrice?: string;
    categoryId?: string;
  }>;
  cartDiscount?: string;
};

export type PromotionEvaluateResult = {
  discountTotal?: string;
  discountAmount?: string;
  promotions?: Array<{
    id: string;
    name?: string;
    code?: string | null;
    discountAmount: string;
  }>;
  lines?: Array<{ productId: string; discountAmount?: string }>;
  message?: string;
};

export const PROMOTION_TYPES: Array<{ value: PromotionType; label: string }> = [
  { value: "PERCENT_OFF", label: "Percent off" },
  { value: "FIXED_OFF", label: "Fixed amount off" },
  { value: "MIN_SPEND_PERCENT", label: "Min spend · percent" },
  { value: "MIN_SPEND_FIXED", label: "Min spend · fixed" },
];

export const PROMOTION_TARGETS: Array<{ value: PromotionTarget; label: string }> = [
  { value: "ALL", label: "Entire cart" },
  { value: "PRODUCT", label: "Product" },
  { value: "CATEGORY", label: "Category" },
];

const asList = <T>(json: unknown): T[] => {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === "object" && Array.isArray((json as { items?: unknown }).items)) {
    return (json as { items: T[] }).items;
  }
  return [];
};

export const promotionsFetch = async (
  path: string,
  init?: RequestInit,
): Promise<Response> =>
  fetch(`/api/proxy${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

export const readError = async (res: Response, fallback: string) => {
  const data = await res.json().catch(() => ({}));
  return parseApiMessage(data, fallback);
};

export const listPromotions = async (): Promise<Promotion[]> => {
  const res = await promotionsFetch("/promotions");
  if (!res.ok) throw new Error(await readError(res, "Could not load promotions"));
  return asList<Promotion>(await res.json());
};

export const createPromotion = async (
  body: Record<string, unknown>,
): Promise<Promotion> => {
  const res = await promotionsFetch("/promotions", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not create promotion"));
  return (await res.json()) as Promotion;
};

export const updatePromotion = async (
  id: string,
  body: Record<string, unknown>,
): Promise<Promotion> => {
  const res = await promotionsFetch(`/promotions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not update promotion"));
  return (await res.json()) as Promotion;
};

export const evaluatePromotion = async (
  body: PromotionEvaluateInput,
): Promise<PromotionEvaluateResult> => {
  const res = await promotionsFetch("/promotions/evaluate", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not evaluate promotion"));
  return (await res.json()) as PromotionEvaluateResult;
};

export const promotionTypeLabel = (type: string) =>
  PROMOTION_TYPES.find((t) => t.value === type)?.label ?? type;
