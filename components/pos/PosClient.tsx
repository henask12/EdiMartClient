"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import MiniSearch from "minisearch";
import { useTranslations } from "next-intl";
import {
  Archive,
  BookmarkPlus,
  Camera,
  Grid2X2,
  HelpCircle,
  LayoutList,
  Minus,
  Plus,
  Search,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { ManagerApprovalDialog, type ApprovalAction } from "@/components/ManagerApprovalDialog";
import {
  PosCustomerChip,
  PosCustomerPicker,
} from "@/components/pos/PosCustomerPicker";
import { PosPaymentSheet } from "@/components/pos/PosPaymentSheet";
import { PosSuccessPanel } from "@/components/pos/PosSuccessPanel";
import { useHidScanner } from "@/components/pos/useHidScanner";
import { ProductImage } from "@/components/ProductImage";
import { usePermission } from "@/components/PermissionProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Kbd } from "@/components/ui/Kbd";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import {
  parseLoyaltySettings,
  type Customer,
  type LoyaltySettings,
} from "@/lib/customers";
import { formatMoney } from "@/lib/format-money";
import { newIdempotencyKey, shouldRotateKey } from "@/lib/idempotency";
import {
  enqueueSaleCheckout,
  pendingSaleLabel,
} from "@/lib/offline/outbox";
import { playScannerBeep } from "@/lib/pos-beep";
import {
  clearCart,
  emptyCart,
  loadCart,
  loadLocalParked,
  saveCart,
  saveLocalParked,
} from "@/lib/pos-cart-db";
import {
  addMoney,
  compareMoney,
  computeCartTotals,
  mulMoney,
  pctOf,
  subMoney,
} from "@/lib/pos-money";
import { parsePosSettings, persistLocalPosSettings } from "@/lib/pos-settings";
import type {
  CheckoutResult,
  ParkedSale,
  PosCartLine,
  PosCartState,
  PosCategory,
  PosPaymentLine,
  PosProduct,
  PosSettings,
} from "@/lib/pos-types";
import {
  getStoredRegisterCode,
  registerHeaders,
} from "@/lib/register-device";
import {
  fetchCurrentShift,
  parseShiftSettings,
  type Shift,
} from "@/lib/shifts";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";

const lineId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

type PendingApproval = {
  action: ApprovalAction;
  title?: string;
  description?: string;
  resolve: (token: string | null) => void;
};

export const PosClient = () => {
  const t = useTranslations("Pos");
  const { can, isOwner, me } = usePermission();
  const searchRef = useRef<HTMLInputElement>(null);
  const attemptKey = useRef(newIdempotencyKey());
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<{ detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [settings, setSettings] = useState<PosSettings>(() => parsePosSettings(null));
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cart, setCart] = useState<PosCartState>(emptyCart);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    result: CheckoutResult;
    changeDue: string;
    lines: PosCartLine[];
    cartDiscount: string;
  } | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountMode, setDiscountMode] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdLabel, setHoldLabel] = useState("");
  const [parkedOpen, setParkedOpen] = useState(false);
  const [parked, setParked] = useState<ParkedSale[]>([]);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveLineId, setReserveLineId] = useState("");
  const [reserveQty, setReserveQty] = useState("1");
  const [reserveCustomerName, setReserveCustomerName] = useState("");
  const [reserveSubmitting, setReserveSubmitting] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [online, setOnline] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [requireOpenShift, setRequireOpenShift] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState("");
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);

  const index = useMemo(() => {
    const ms = new MiniSearch<PosProduct>({
      fields: ["name", "nameAm", "sku", "barcodeText"],
      storeFields: ["id"],
      searchOptions: { prefix: true, fuzzy: 0.2 },
      extractField: (doc, field) => {
        if (field === "barcodeText") {
          return (doc.barcodes ?? []).map((b) => b.barcode).join(" ");
        }
        const v = (doc as Record<string, unknown>)[field];
        return v == null ? "" : String(v);
      },
    });
    if (products.length) ms.addAll(products);
    return ms;
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (categoryId) list = list.filter((p) => (p.categoryId ?? p.category?.id) === categoryId);
    if (query.trim()) {
      const hits = index.search(query.trim());
      const ids = new Set(hits.map((h) => String(h.id)));
      list = list.filter((p) => ids.has(p.id));
    }
    return list;
  }, [products, categoryId, query, index]);

  const favourites = useMemo(() => {
    const ids = new Set(settings.favourites);
    return products.filter((p) => ids.has(p.id)).slice(0, 12);
  }, [products, settings.favourites]);

  const totals = useMemo(
    () =>
      computeCartTotals(
        cart.lines,
        cart.cartDiscount,
        settings.vatRate,
        settings.vatInclusive,
      ),
    [cart.lines, cart.cartDiscount, settings.vatRate, settings.vatInclusive],
  );

  const persist = useCallback((next: PosCartState) => {
    setCart(next);
    void saveCart(next);
  }, []);

  const requestApproval = useCallback((action: ApprovalAction, title?: string, description?: string) => {
    return new Promise<string | null>((resolve) => {
      setPendingApproval({ action, title, description, resolve });
    });
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const [prodRes, catRes, settingsRes] = await Promise.all([
        fetch("/api/proxy/products?take=500", { cache: "no-store" }),
        fetch("/api/proxy/categories", { cache: "no-store" }),
        fetch("/api/proxy/settings/store", { cache: "no-store" }),
      ]);
      if (prodRes.ok) {
        const data = (await prodRes.json()) as { items: PosProduct[] };
        setProducts(data.items ?? []);
      }
      if (catRes.ok) {
        const data = (await catRes.json()) as PosCategory[] | { items: PosCategory[] };
        setCategories(Array.isArray(data) ? data : data.items ?? []);
      }
      if (settingsRes.ok) {
        const data = (await settingsRes.json()) as Record<string, unknown>;
        setSettings(parsePosSettings(data));
        setRequireOpenShift(parseShiftSettings(data).requireOpenShift);
        setLoyaltySettings(parseLoyaltySettings(data));
      } else {
        setSettings(parsePosSettings(null));
      }
      const shift = await fetchCurrentShift();
      setCurrentShift(shift);
    } catch {
      toastError(t("catalogLoadFailed"));
    }
  }, [t]);

  useEffect(() => {
    void (async () => {
      const stored = await loadCart();
      setCart(stored);
      setHydrated(true);
      await loadCatalog();
      const localParked = await loadLocalParked();
      setParked(localParked);
    })();
  }, [loadCatalog]);

  const ensureCanCharge = useCallback((): boolean => {
    if (requireOpenShift && (!currentShift || currentShift.status !== "OPEN")) {
      toastError(`${t("shiftRequired")} (${t("openShiftLink")})`);
      return false;
    }
    return true;
  }, [requireOpenShift, currentShift, t]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const findByCode = useCallback(
    (code: string) => {
      const q = code.trim().toLowerCase();
      return products.find(
        (p) =>
          p.sku?.toLowerCase() === q ||
          (p.barcodes ?? []).some((b) => b.barcode.toLowerCase() === q),
      );
    },
    [products],
  );

  const canOversell = isOwner || can("PRICE_OVERRIDE");

  const addProduct = useCallback(
    async (product: PosProduct, qty = 1, fromScan = false) => {
      const available = Number(product.available ?? 0);
      const existing = cart.lines.find((l) => l.productId === product.id);
      const nextQty = (existing?.qty ?? 0) + qty;
      if (nextQty > available && available >= 0) {
        if (!canOversell) {
          toastError(t("qtyExceedsAvailable", { available: product.available }));
          return;
        }
        const token = await requestApproval(
          "PRICE_OVERRIDE",
          t("oversellApproval"),
          t("oversellApprovalHint"),
        );
        if (!token) return;
        // Token reserved for future API enforcement; client still logs intent via toast.
        toastSuccess(t("oversellApproved"));
      }

      const nextLines = (() => {
        if (existing) {
          return cart.lines.map((l) =>
            l.productId === product.id
              ? {
                  ...l,
                  qty: l.qty + qty,
                  flashedAt: fromScan ? Date.now() : l.flashedAt,
                }
              : l,
          );
        }
        const line: PosCartLine = {
          id: lineId(),
          productId: product.id,
          name: product.name,
          unitPrice: product.sellingPrice,
          qty,
          lineDiscount: "0.00",
          available: product.available,
          flashedAt: fromScan ? Date.now() : undefined,
        };
        return [...cart.lines, line];
      })();

      persist({ ...cart, lines: nextLines, updatedAt: Date.now() });
      if (fromScan) {
        void playScannerBeep(settings.scannerBeep);
        setSelectedLineId(
          nextLines.find((l) => l.productId === product.id)?.id ?? null,
        );
      }
    },
    [cart, canOversell, persist, requestApproval, settings.scannerBeep, t],
  );

  const handleScan = useCallback(
    (code: string) => {
      const product = findByCode(code);
      if (!product) {
        if (can("PRODUCTS_CREATE")) {
          toastError(t("unknownBarcodeCreate", { code }));
        } else {
          toastError(t("unknownBarcode", { code }));
        }
        return;
      }
      void addProduct(product, 1, true);
    },
    [addProduct, can, findByCode, t],
  );

  useHidScanner({ enabled: hydrated && !success, onScan: handleScan });

  const updateQty = (id: string, delta: number) => {
    const line = cart.lines.find((l) => l.id === id);
    if (!line) return;
    const nextQty = line.qty + delta;
    if (nextQty <= 0) {
      persist({
        ...cart,
        lines: cart.lines.filter((l) => l.id !== id),
        updatedAt: Date.now(),
      });
      return;
    }
    const available = Number(line.available ?? Infinity);
    if (nextQty > available && !canOversell) {
      toastError(t("qtyExceedsAvailable", { available: String(line.available) }));
      return;
    }
    persist({
      ...cart,
      lines: cart.lines.map((l) => (l.id === id ? { ...l, qty: nextQty } : l)),
      updatedAt: Date.now(),
    });
  };

  const removeLine = (id: string) => {
    persist({
      ...cart,
      lines: cart.lines.filter((l) => l.id !== id),
      updatedAt: Date.now(),
    });
  };

  const applyDiscount = async () => {
    if (!can("DISCOUNT_APPLY") && !isOwner) {
      toastError(t("noDiscountPermission"));
      return;
    }
    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      toastError(t("enterAmount"));
      return;
    }
    const base = totals.subtotal;
    const amount =
      discountMode === "percent" ? pctOf(base, value) : value.toFixed(2);
    const limitPct = Number(settings.discountLimitPercent);
    const pct = (Number(amount) / Math.max(Number(base), 0.01)) * 100;
    let approvalToken: string | null = null;
    if (pct > limitPct && !can("DISCOUNT_ABOVE_LIMIT") && !isOwner) {
      approvalToken = await requestApproval(
        "DISCOUNT_OVER_LIMIT",
        t("discountApproval"),
        t("discountApprovalHint"),
      );
      if (!approvalToken) return;
    }
    void approvalToken;
    persist({
      ...cart,
      cartDiscount: amount,
      cartDiscountReason: discountReason.trim() || undefined,
      updatedAt: Date.now(),
    });
    setDiscountOpen(false);
    setDiscountValue("");
    setDiscountReason("");
  };

  const handleHold = async () => {
    if (!cart.lines.length) {
      toastError(t("cartEmpty"));
      return;
    }
    const label = holdLabel.trim() || t("holdDefaultLabel");
    const cartSnapshot: PosCartState = { ...cart, lines: [...cart.lines] };
    const toLocalPark = (): ParkedSale => ({
      id: lineId(),
      label,
      cart: cartSnapshot,
      parkedAt: new Date().toISOString(),
      parkedBy: me.displayName ?? me.email,
    });
    try {
      const res = await fetch("/api/proxy/sales/park", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label,
          notes: cart.notes || undefined,
          payload: cartSnapshot,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          id: string;
          label: string;
          notes?: string | null;
          payload: PosCartState;
          createdAt: string;
          createdBy?: { displayName?: string | null; email?: string };
        };
        const mapped: ParkedSale = {
          id: data.id,
          label: data.label,
          cart: data.payload ?? cartSnapshot,
          parkedAt: data.createdAt ?? new Date().toISOString(),
          parkedBy:
            data.createdBy?.displayName ??
            data.createdBy?.email ??
            me.displayName ??
            me.email ??
            undefined,
        };
        setParked((prev) => [mapped, ...prev]);
      } else {
        const next = [toLocalPark(), ...(await loadLocalParked())];
        await saveLocalParked(next);
        setParked(next);
        if (res.status !== 404) {
          toastError(parseApiMessage(await res.json().catch(() => ({})), t("parkLocalFallback")));
        } else {
          toastSuccess(t("parkLocalFallback"));
        }
      }
    } catch {
      const next = [toLocalPark(), ...(await loadLocalParked())];
      await saveLocalParked(next);
      setParked(next);
      toastSuccess(t("parkLocalFallback"));
    }
    await clearCart();
    persist(emptyCart());
    setHoldOpen(false);
    setHoldLabel("");
    toastSuccess(t("saleParked"));
  };

  const openParkedSales = () => {
    setParkedOpen(true);
    void loadParkedList();
  };

  const canReserve = can("PRODUCTS_RESERVE") || isOwner;

  const openReserveDialog = () => {
    if (!canReserve) {
      toastError(t("reserveNoPermission"));
      return;
    }
    const selected =
      cart.lines.find((l) => l.id === selectedLineId) ??
      (cart.lines.length === 1 ? cart.lines[0] : null);
    if (!selected && cart.lines.length === 0) {
      toastError(t("reserveNeedLine"));
      return;
    }
    const line = selected ?? cart.lines[0];
    setReserveLineId(line.id);
    setReserveQty(String(line.qty));
    setReserveCustomerName(customer?.name?.trim() || customer?.phone?.trim() || "");
    setReserveOpen(true);
  };

  const handleReserveStock = async () => {
    if (!canReserve) {
      toastError(t("reserveNoPermission"));
      return;
    }
    const line = cart.lines.find((l) => l.id === reserveLineId);
    if (!line || !(Number(reserveQty) > 0)) {
      toastError(t("reserveNeedLine"));
      return;
    }
    setReserveSubmitting(true);
    try {
      const res = await fetch("/api/proxy/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: line.productId,
          quantity: String(reserveQty),
          customerName: reserveCustomerName.trim() || undefined,
          customerId: customer?.id || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(parseApiMessage(data, t("reserveFailed")));
        return;
      }
      toastSuccess(t("reserveSuccess"));
      setReserveOpen(false);
      const qtyReserved = Number(reserveQty);
      const lineIdReserved = line.id;
      setCart((prev) => {
        const nextLines = prev.lines
          .map((row) => {
            if (row.id !== lineIdReserved) return row;
            const left = row.qty - qtyReserved;
            if (left <= 0) return null;
            return { ...row, qty: left, flashedAt: Date.now() };
          })
          .filter((row): row is PosCartLine => !!row);
        const next = { ...prev, lines: nextLines, updatedAt: Date.now() };
        persist(next);
        return next;
      });
      void loadCatalog();
    } catch {
      toastError(t("reserveFailed"));
    } finally {
      setReserveSubmitting(false);
    }
  };

  const mapApiParked = (row: {
    id: string;
    label: string;
    notes?: string | null;
    payload?: PosCartState | { lines?: PosCartLine[] };
    createdAt?: string;
    createdBy?: { displayName?: string | null; email?: string };
  }): ParkedSale | null => {
    const payload = row.payload;
    const cartState: PosCartState | null =
      payload && "lines" in payload && Array.isArray(payload.lines)
        ? {
            lines: payload.lines,
            cartDiscount:
              "cartDiscount" in payload && typeof payload.cartDiscount === "string"
                ? payload.cartDiscount
                : "0.00",
            cartDiscountReason:
              "cartDiscountReason" in payload && typeof payload.cartDiscountReason === "string"
                ? payload.cartDiscountReason
                : undefined,
            notes:
              "notes" in payload && typeof payload.notes === "string"
                ? payload.notes
                : row.notes ?? "",
            updatedAt:
              "updatedAt" in payload && typeof payload.updatedAt === "number"
                ? payload.updatedAt
                : Date.now(),
          }
        : null;
    if (!cartState) return null;
    return {
      id: row.id,
      label: row.label,
      cart: cartState,
      parkedAt: row.createdAt ?? new Date().toISOString(),
      parkedBy: row.createdBy?.displayName ?? row.createdBy?.email,
    };
  };

  const loadParkedList = async () => {
    try {
      const res = await fetch("/api/proxy/sales/parked", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as unknown;
        const rows = Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: unknown }).items)
            ? (data as { items: unknown[] }).items
            : [];
        const mapped = rows
          .map((row) => mapApiParked(row as Parameters<typeof mapApiParked>[0]))
          .filter((row): row is ParkedSale => !!row);
        if (mapped.length) {
          setParked(mapped);
          return;
        }
      }
    } catch {
      /* fall through */
    }
    setParked(await loadLocalParked());
  };

  const resumeParked = async (row: ParkedSale) => {
    let nextCart = row.cart;
    try {
      const res = await fetch(`/api/proxy/sales/parked/${row.id}/resume`, {
        method: "POST",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          payload?: PosCartState;
        };
        if (data.payload && Array.isArray(data.payload.lines)) {
          nextCart = data.payload;
        }
      } else {
        await fetch(`/api/proxy/sales/parked/${row.id}`, { method: "DELETE" });
      }
    } catch {
      /* local park */
    }
    persist(nextCart);
    const next = (await loadLocalParked()).filter((p) => p.id !== row.id);
    await saveLocalParked(next);
    setParked((prev) => prev.filter((p) => p.id !== row.id));
    setParkedOpen(false);
    toastSuccess(t("parkResumed"));
  };

  const buildCheckoutBody = (
    payments: PosPaymentLine[],
    extras: {
      clientSaleId: string;
      createdOffline: boolean;
      registerCode: string;
    },
  ) => {
    const primary = payments[0];
    const proofImagePaths = [
      ...new Set(payments.flatMap((p) => p.proofPaths ?? [])),
    ];
    return {
      lines: cart.lines.map((l) => ({
        productId: l.productId,
        quantity: String(l.qty),
        unitPrice: l.priceOverridden ? l.unitPrice : undefined,
        lineDiscount: Number(l.lineDiscount) > 0 ? l.lineDiscount : undefined,
        discountReason: l.discountReason,
      })),
      notes: cart.notes || undefined,
      cartDiscount: Number(cart.cartDiscount) > 0 ? cart.cartDiscount : undefined,
      discountReason: cart.cartDiscountReason,
      payments: payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        reference: p.reference,
        proofImagePath: p.proofPaths?.[0],
        tenderedAmount: p.method === "CASH" ? p.amount : undefined,
      })),
      paymentMethod: primary?.method,
      paymentReference: primary?.reference,
      proofImagePaths: proofImagePaths.length ? proofImagePaths : undefined,
      customerId: customer?.id,
      couponCode: couponCode.trim() || undefined,
      loyaltyPointsToRedeem: loyaltyPointsToRedeem.trim()
        ? Number(loyaltyPointsToRedeem)
        : undefined,
      clientSaleId: extras.clientSaleId,
      createdOffline: extras.createdOffline,
      registerCode: extras.registerCode,
    };
  };

  const finishLocalSuccess = async (
    payments: PosPaymentLine[],
    result: CheckoutResult,
  ) => {
    const tendered = payments.reduce((s, p) => addMoney(s, p.amount), "0.00");
    const changeDue =
      compareMoney(tendered, totals.total) > 0
        ? subMoney(tendered, totals.total)
        : "0.00";
    setSuccess({
      result,
      changeDue,
      lines: cart.lines,
      cartDiscount: cart.cartDiscount,
    });
    setPaymentOpen(false);
    setCustomer(null);
    setCouponCode("");
    setLoyaltyPointsToRedeem("");
    await clearCart();
    persist(emptyCart());
    attemptKey.current = newIdempotencyKey();
    void loadCatalog();
  };

  const queueOfflineSale = async (
    payments: PosPaymentLine[],
    clientSaleId: string,
    body: unknown,
    headers: Record<string, string>,
  ) => {
    const label = pendingSaleLabel(clientSaleId);
    await enqueueSaleCheckout({
      clientSaleId,
      idempotencyKey: attemptKey.current,
      body,
      headers: {
        ...headers,
      },
      label,
    });
    toastSuccess(t("queuedOffline"));
    await finishLocalSuccess(payments, {
      id: clientSaleId,
      saleNumber: label,
      pendingSync: true,
      grandTotal: totals.total,
      total: totals.total,
    });
  };

  const handleComplete = async (payments: PosPaymentLine[], approvalToken?: string) => {
    if (!cart.lines.length) {
      toastError(t("cartEmpty"));
      return;
    }
    setSubmitting(true);
    if (!ensureCanCharge()) {
      setSubmitting(false);
      return;
    }

    const clientSaleId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : newIdempotencyKey();
    const registerCode = getStoredRegisterCode();
    const createdOffline = typeof navigator !== "undefined" && !navigator.onLine;
    const body = buildCheckoutBody(payments, {
      clientSaleId,
      createdOffline,
      registerCode,
    });

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "idempotency-key": attemptKey.current,
      ...registerHeaders(),
    };
    if (approvalToken) headers["x-approval-token"] = approvalToken;

    if (createdOffline) {
      await queueOfflineSale(payments, clientSaleId, body, headers);
      setSubmitting(false);
      return;
    }

    let res: Response;
    try {
      res = await fetch("/api/proxy/sales/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch {
      const offlineBody = buildCheckoutBody(payments, {
        clientSaleId,
        createdOffline: true,
        registerCode,
      });
      await queueOfflineSale(payments, clientSaleId, offlineBody, headers);
      setSubmitting(false);
      return;
    }

    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        const offlineBody = buildCheckoutBody(payments, {
          clientSaleId,
          createdOffline: true,
          registerCode,
        });
        await queueOfflineSale(payments, clientSaleId, offlineBody, headers);
        return;
      }
      if (shouldRotateKey(res.status)) attemptKey.current = newIdempotencyKey();
      const code = String((data as { code?: string }).code ?? "");
      if (code === "SHIFT_REQUIRED") {
        toastError(`${t("shiftRequired")} (${t("openShiftLink")})`);
        return;
      }
      if (code.startsWith("APPROVAL_") || res.status === 403) {
        const token = await requestApproval(
          "DISCOUNT_OVER_LIMIT",
          t("managerApproval"),
          parseApiMessage(data, t("approvalRequired")),
        );
        if (token) {
          await handleComplete(payments, token);
          return;
        }
      }
      toastError(parseApiMessage(data, t("checkoutFailed")));
      return;
    }

    await finishLocalSuccess(payments, data as CheckoutResult);
  };

  const handleNewSale = () => {
    setSuccess(null);
    setCustomer(null);
    setCouponCode("");
    setLoyaltyPointsToRedeem("");
    searchRef.current?.focus();
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (success) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const typing =
        tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "?" && !typing) {
        e.preventDefault();
        setCheatOpen(true);
        return;
      }
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "F3") {
        e.preventDefault();
        setCustomerPickerOpen(true);
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        setDiscountOpen(true);
        return;
      }
      if (e.key === "F6") {
        e.preventDefault();
        setHoldOpen(true);
        return;
      }
      if (e.key === "F7") {
        e.preventDefault();
        openParkedSales();
        return;
      }
      if (e.key === "F8" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        if (cart.lines.length && ensureCanCharge()) setPaymentOpen(true);
        return;
      }
      if (e.key === "F9") {
        e.preventDefault();
        openReserveDialog();
        return;
      }
      if (e.key === "Escape") {
        if (paymentOpen) setPaymentOpen(false);
        else if (mobileCartOpen) setMobileCartOpen(false);
        else if (cheatOpen) setCheatOpen(false);
        else if (cart.lines.length && !typing) {
          if (window.confirm(t("clearCartConfirm"))) {
            void clearCart();
            persist(emptyCart());
          }
        }
        return;
      }
      if (typing) return;
      if ((e.key === "+" || e.key === "=") && selectedLineId) {
        e.preventDefault();
        updateQty(selectedLineId, 1);
      }
      if ((e.key === "-" || e.key === "_") && selectedLineId) {
        e.preventDefault();
        updateQty(selectedLineId, -1);
      }
      if (e.key === "Delete" && selectedLineId) {
        e.preventDefault();
        removeLine(selectedLineId);
        setSelectedLineId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    success,
    cart.lines.length,
    selectedLineId,
    paymentOpen,
    mobileCartOpen,
    cheatOpen,
    persist,
    ensureCanCharge,
    t,
  ]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    detectorRef.current = null;
    setCameraOpen(false);
  };

  const startCamera = async () => {
    const BD = (window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
      };
    }).BarcodeDetector;
    if (!BD) {
      toastError(t("cameraUnsupported"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      detectorRef.current = new BD({
        formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a", "upc_e"],
      });
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      toastError(t("cameraDenied"));
    }
  };

  useEffect(() => {
    if (!cameraOpen) return;
    let alive = true;
    const tick = async () => {
      if (!alive || !videoRef.current || !detectorRef.current) return;
      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        if (codes[0]?.rawValue) {
          handleScan(codes[0].rawValue);
          stopCamera();
          return;
        }
      } catch {
        /* keep scanning */
      }
      requestAnimationFrame(() => void tick());
    };
    const id = requestAnimationFrame(() => void tick());
    return () => {
      alive = false;
      cancelAnimationFrame(id);
    };
  }, [cameraOpen, handleScan]);

  const toggleBeep = () => {
    const next = { ...settings, scannerBeep: !settings.scannerBeep };
    setSettings(next);
    persistLocalPosSettings(next);
  };

  const stockBadge = (p: PosProduct) => {
    const status = p.stockStatus ?? (Number(p.available) <= 0 ? "out of stock" : "in_stock");
    if (status === "out of stock" || Number(p.available) <= 0) {
      return <Badge variant="danger">{t("outOfStock")}</Badge>;
    }
    if (status === "low stock") {
      return <Badge variant="warning">{t("lowStock")}</Badge>;
    }
    return null;
  };

  const cartPanel = (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <PosCustomerChip
              customer={customer}
              onOpen={() => setCustomerPickerOpen(true)}
              onClear={() => setCustomer(null)}
            />
            <p className="mt-1 text-xs text-text-muted">
              {t("linesCount", { count: cart.lines.length })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="relative gap-1.5"
              onClick={openParkedSales}
              aria-label={t("openParked")}
              title={`${t("parkedSales")} (F7)`}
            >
              <Archive className="size-3.5" />
              <span className="hidden sm:inline">
                {parked.length > 0
                  ? t("parkedWithCount", { count: parked.length })
                  : t("parked")}
              </span>
              {parked.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-fg sm:static sm:ml-0.5 sm:size-auto sm:rounded-md sm:bg-primary-soft sm:px-1.5 sm:py-0 sm:text-[10px] sm:text-primary">
                  {parked.length}
                </span>
              ) : null}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setMobileCartOpen(false)}
              aria-label={t("close")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setHoldOpen(true)}
            title={`${t("holdSale")} (F6)`}
          >
            {t("hold")}
            <Kbd className="ml-1 hidden opacity-70 xl:inline">F6</Kbd>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setDiscountOpen(true)}
            title={`${t("discount")} (F4)`}
          >
            {t("discount")}
            <Kbd className="ml-1 hidden opacity-70 xl:inline">F4</Kbd>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setNoteOpen(true)}
            title={t("note")}
          >
            {t("note")}
          </Button>
          {canReserve ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1"
              onClick={openReserveDialog}
              title={`${t("reserveSale")} (F9)`}
            >
              <BookmarkPlus className="size-3.5" />
              {t("reserve")}
              <Kbd className="ml-1 hidden opacity-70 xl:inline">F9</Kbd>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCheatOpen(true)}
            aria-label={t("shortcuts")}
            title={`${t("shortcuts")} (?)`}
          >
            <HelpCircle className="size-3.5" />
          </Button>
        </div>
      </div>

      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {cart.lines.length === 0 ? (
          <li className="py-10 text-center text-sm text-text-muted">{t("cartEmptyHint")}</li>
        ) : (
          cart.lines.map((line) => {
            const lineTotal = subMoney(mulMoney(line.unitPrice, line.qty), line.lineDiscount);
            const flashed = line.flashedAt && Date.now() - line.flashedAt < 800;
            return (
              <li
                key={line.id}
                className={cn(
                  "rounded-xl border border-border bg-surface p-3 transition",
                  selectedLineId === line.id && "border-primary",
                  flashed && "ring-2 ring-primary",
                )}
                onClick={() => setSelectedLineId(line.id)}
                onKeyDown={(e: ReactKeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedLineId(line.id);
                }}
                tabIndex={0}
                role="button"
                aria-label={line.name}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">{line.name}</p>
                    <p className="text-xs tabular-nums text-text-muted">
                      {formatMoney(line.unitPrice)}
                      {line.priceOverridden ? ` · ${t("priceOverridden")}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-text">
                    {formatMoney(lineTotal)}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="size-11 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQty(line.id, -1);
                    }}
                    aria-label={t("decreaseQty")}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="min-w-10 text-center text-base font-semibold tabular-nums">
                    {line.qty}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="size-11 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQty(line.id, 1);
                    }}
                    aria-label={t("increaseQty")}
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-11 shrink-0 text-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLine(line.id);
                    }}
                    aria-label={t("removeLine")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="space-y-2 border-t border-border p-4">
        <div className="flex justify-between text-sm text-text-muted">
          <span>{t("subtotal")}</span>
          <span className="tabular-nums">{formatMoney(totals.subtotal)}</span>
        </div>
        {Number(totals.discountTotal) > 0 ? (
          <div className="flex justify-between text-sm text-text-muted">
            <span>{t("discount")}</span>
            <span className="tabular-nums">-{formatMoney(totals.discountTotal)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-sm text-text-muted">
          <span>
            {t("vat")} ({settings.vatRate}%{settings.vatInclusive ? ` ${t("inclusive")}` : ""})
          </span>
          <span className="tabular-nums">{formatMoney(totals.vat)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2 pt-1">
          <span className="text-sm font-semibold uppercase tracking-wide text-text">{t("total")}</span>
          <span className="text-3xl font-semibold tabular-nums text-text sm:text-4xl">
            {formatMoney(totals.total)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setHoldOpen(true)}>
            {t("hold")}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={openParkedSales}>
            {t("parked")}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setDiscountOpen(true)}>
            {t("discount")}
          </Button>
          {canReserve ? (
            <Button type="button" variant="secondary" size="sm" onClick={openReserveDialog}>
              {t("reserve")}
            </Button>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={() => setNoteOpen(true)}>
              {t("note")}
            </Button>
          )}
        </div>
        {requireOpenShift && (!currentShift || currentShift.status !== "OPEN") ? (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-center text-sm text-warning">
            {t("shiftRequired")}{" "}
            <Link href="/shifts" className="font-semibold underline">
              {t("openShiftLink")}
            </Link>
          </p>
        ) : null}
        <Button
          type="button"
          size="pos"
          fullWidth
          disabled={!cart.lines.length}
          onClick={() => {
            if (ensureCanCharge()) {
              setMobileCartOpen(false);
              setPaymentOpen(true);
            }
          }}
        >
          {t("charge", { amount: formatMoney(totals.total) })}
        </Button>
      </div>
    </div>
  );

  const handleMobileCharge = () => {
    if (!cart.lines.length) {
      setMobileCartOpen(true);
      return;
    }
    if (ensureCanCharge()) {
      setMobileCartOpen(false);
      setPaymentOpen(true);
    }
  };

  if (success) {
    return (
      <PosSuccessPanel
        result={success.result}
        changeDue={success.changeDue}
        lines={success.lines}
        cartDiscount={success.cartDiscount}
        settings={settings}
        cashierName={me.displayName ?? me.email}
        onNewSale={handleNewSale}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      {/* Catalog — phone-first full width; cart beside on lg+ */}
      <section className="flex min-h-0 flex-1 flex-col lg:w-[60%] lg:border-r lg:border-border">
        <div className="space-y-3 border-b border-border p-3 sm:p-4">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-14 w-full rounded-xl border border-border bg-surface-muted pl-10 pr-3 text-base text-text outline-none focus-ring"
                aria-label={t("search")}
                enterKeyHint="search"
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="pos"
              onClick={() => void startCamera()}
              aria-label={t("scanCamera")}
            >
              <Camera className="size-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="pos"
              className="hidden sm:inline-flex"
              onClick={toggleBeep}
              aria-label={t("toggleBeep")}
            >
              {settings.scannerBeep ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="pos"
              onClick={() => setViewMode((m) => (m === "grid" ? "list" : "grid"))}
              aria-label={t("toggleView")}
            >
              {viewMode === "grid" ? <LayoutList className="size-5" /> : <Grid2X2 className="size-5" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="pos"
              className="hidden md:inline-flex"
              onClick={() => setCheatOpen(true)}
              aria-label={t("shortcuts")}
            >
              <HelpCircle className="size-5" />
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategoryId("")}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-medium focus-ring",
                !categoryId
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-text-muted hover:bg-surface-muted",
              )}
            >
              {t("allCategories")}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-medium focus-ring",
                  categoryId === c.id
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-text-muted hover:bg-surface-muted",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>

          {favourites.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {t("favourites")}
              </p>
              <div className="flex gap-2 overflow-x-auto">
                {favourites.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => void addProduct(p)}
                    className="min-h-12 shrink-0 rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm font-medium hover:bg-surface-muted focus-ring"
                  >
                    <span className="block max-w-28 truncate">{p.name}</span>
                    <span className="tabular-nums text-xs text-text-muted">
                      {formatMoney(p.sellingPrice)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-28 sm:p-4 lg:pb-4">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void addProduct(p)}
                  className="flex min-h-[7.5rem] flex-col overflow-hidden rounded-xl border border-border bg-surface text-left transition active:scale-[0.98] hover:border-primary/40 focus-ring"
                >
                  <div className="relative aspect-square">
                    <ProductImage
                      imageUrl={p.imageUrl}
                      alt={p.name}
                      className="absolute inset-0 h-full w-full"
                      iconClassName="size-8"
                      sizes="(max-width: 640px) 50vw, 20vw"
                    />
                    <div className="absolute left-2 top-2">{stockBadge(p)}</div>
                  </div>
                  <div className="space-y-1 p-2.5">
                    <p className="line-clamp-2 text-sm font-medium text-text">{p.name}</p>
                    <p className="text-sm font-semibold tabular-nums text-primary">
                      {formatMoney(p.sellingPrice)}
                    </p>
                    <p className="text-xs tabular-nums text-text-muted">
                      {t("available")}: {p.available}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void addProduct(p)}
                    className="flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left active:bg-surface-muted hover:bg-surface-muted focus-ring"
                  >
                    <ProductImage
                      imageUrl={p.imageUrl}
                      alt={p.name}
                      className="size-12 shrink-0 rounded-lg"
                      iconClassName="size-5"
                      sizes="48px"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text">{p.name}</p>
                      <p className="text-xs text-text-muted">
                        {p.sku ? `${p.sku} · ` : ""}
                        {t("available")}: {p.available}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums text-primary">
                        {formatMoney(p.sellingPrice)}
                      </p>
                      {stockBadge(p)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!filtered.length ? (
            <p className="py-12 text-center text-sm text-text-muted">{t("noProducts")}</p>
          ) : null}
        </div>

        {/* Mobile sticky till bar — thumb reach */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-3 pt-2.5 backdrop-blur-md lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-lg items-stretch gap-2">
            <Button
              type="button"
              variant="secondary"
              size="pos"
              className="relative min-w-0 flex-1"
              onClick={() => setMobileCartOpen(true)}
              aria-label={t("openCart", { count: cart.lines.length })}
            >
              <span className="truncate">
                {t("cart")}
                {cart.lines.length > 0 ? ` · ${cart.lines.length}` : ""}
              </span>
              {cart.lines.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-fg">
                  {cart.lines.length > 9 ? "9+" : cart.lines.length}
                </span>
              ) : null}
            </Button>
            <Button
              type="button"
              size="pos"
              className="min-w-0 flex-[1.35] px-3"
              disabled={!cart.lines.length}
              onClick={handleMobileCharge}
              aria-label={t("charge", { amount: formatMoney(totals.total) })}
            >
              <span className="flex min-w-0 flex-col items-center leading-tight">
                <span className="truncate text-xs font-medium opacity-90">{t("chargeShort")}</span>
                <span className="truncate text-base tabular-nums">{formatMoney(totals.total)}</span>
              </span>
            </Button>
          </div>
        </div>
      </section>

      {/* Desktop cart */}
      <aside className="hidden min-h-0 w-[40%] flex-col bg-surface lg:flex">{cartPanel}</aside>

      {/* Mobile cart sheet — bottom sheet for thumb reach */}
      <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <SheetContent side="bottom" className="max-w-full p-0 sm:max-w-none lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("cart")}</SheetTitle>
          </SheetHeader>
          <div className="flex max-h-[92dvh] min-h-[70dvh] flex-col">{cartPanel}</div>
        </SheetContent>
      </Sheet>

      <PosPaymentSheet
        open={paymentOpen}
        amountDue={totals.total}
        denominations={settings.denominations}
        submitting={submitting}
        customer={customer}
        loyaltySettings={loyaltySettings}
        couponCode={couponCode}
        loyaltyPointsToRedeem={loyaltyPointsToRedeem}
        onCouponCodeChange={setCouponCode}
        onLoyaltyPointsChange={setLoyaltyPointsToRedeem}
        onClose={() => setPaymentOpen(false)}
        onComplete={(payments) => void handleComplete(payments)}
      />

      <PosCustomerPicker
        open={customerPickerOpen}
        selected={customer}
        canManage={can("CUSTOMERS_MANAGE")}
        onClose={() => setCustomerPickerOpen(false)}
        onSelect={setCustomer}
      />

      {pendingApproval ? (
        <ManagerApprovalDialog
          open
          action={pendingApproval.action}
          title={pendingApproval.title}
          description={pendingApproval.description}
          onApproved={(token) => {
            pendingApproval.resolve(token);
            setPendingApproval(null);
          }}
          onCancel={() => {
            pendingApproval.resolve(null);
            setPendingApproval(null);
          }}
        />
      ) : null}

      {/* Discount */}
      <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cartDiscount")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={discountMode === "percent" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setDiscountMode("percent")}
              >
                %
              </Button>
              <Button
                type="button"
                variant={discountMode === "fixed" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setDiscountMode("fixed")}
              >
                Br
              </Button>
            </div>
            <Input
              label={discountMode === "percent" ? t("percent") : t("amount")}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              inputMode="decimal"
            />
            <Input
              label={t("reason")}
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDiscountOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void applyDiscount()}>{t("apply")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("saleNote")}</DialogTitle>
          </DialogHeader>
          <Input
            label={t("note")}
            value={cart.notes}
            onChange={(e) =>
              persist({ ...cart, notes: e.target.value, updatedAt: Date.now() })
            }
          />
          <DialogFooter>
            <Button onClick={() => setNoteOpen(false)}>{t("done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold */}
      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("holdSale")}</DialogTitle>
          </DialogHeader>
          <Input
            label={t("holdLabel")}
            value={holdLabel}
            onChange={(e) => setHoldLabel(e.target.value)}
            placeholder={t("holdDefaultLabel")}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setHoldOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void handleHold()}>{t("hold")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parked */}
      <Dialog open={parkedOpen} onOpenChange={setParkedOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("parkedSales")}</DialogTitle>
          </DialogHeader>
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {parked.length === 0 ? (
              <li className="py-6 text-center text-sm text-text-muted">{t("noParked")}</li>
            ) : (
              parked.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => void resumeParked(row)}
                    className="w-full rounded-xl border border-border px-3 py-3 text-left hover:bg-surface-muted focus-ring"
                  >
                    <p className="font-medium text-text">{row.label}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(row.parkedAt).toLocaleString()}
                      {row.parkedBy ? ` · ${row.parkedBy}` : ""}
                      {" · "}
                      {row.cart.lines.length} {t("items")}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Reserve from POS */}
      <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reserveSale")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted">{t("reserveHint")}</p>
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text">{t("reserveProduct")}</span>
              <select
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text focus-ring"
                value={reserveLineId}
                onChange={(e) => {
                  const id = e.target.value;
                  setReserveLineId(id);
                  const row = cart.lines.find((l) => l.id === id);
                  if (row) setReserveQty(String(row.qty));
                }}
                aria-label={t("reserveProduct")}
              >
                {cart.lines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name} · {formatMoney(line.unitPrice)}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label={t("reserveQty")}
              type="number"
              min={0.01}
              step="any"
              value={reserveQty}
              onChange={(e) => setReserveQty(e.target.value)}
            />
            <Input
              label={t("reserveCustomerName")}
              value={reserveCustomerName}
              onChange={(e) => setReserveCustomerName(e.target.value)}
              placeholder={t("reserveCustomerHint")}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReserveOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => void handleReserveStock()}
              disabled={reserveSubmitting}
            >
              {reserveSubmitting ? "…" : t("reserveSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shortcuts */}
      <Dialog open={cheatOpen} onOpenChange={setCheatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("shortcuts")}</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {[
              ["/", "F2", t("shortcutSearch")],
              ["F3", "", t("shortcutCustomer")],
              ["F4", "", t("shortcutDiscount")],
              ["F6", "", t("shortcutHold")],
              ["F7", "", t("shortcutParked")],
              ["F8", "Ctrl+Enter", t("shortcutCharge")],
              ["F9", "", t("shortcutReserve")],
              ["+", "−", t("shortcutQty")],
              ["Delete", "", t("shortcutRemove")],
              ["Esc", "", t("shortcutEsc")],
              ["?", "", t("shortcutHelp")],
            ].map(([a, b, label]) => (
              <li key={String(label)} className="flex items-center justify-between gap-3">
                <span className="text-text-muted">{label}</span>
                <span className="flex gap-1">
                  <Kbd>{a}</Kbd>
                  {b ? <Kbd>{b}</Kbd> : null}
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Camera */}
      <Dialog open={cameraOpen} onOpenChange={(o) => !o && stopCamera()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("scanCamera")}</DialogTitle>
          </DialogHeader>
          <video ref={videoRef} className="aspect-square w-full rounded-xl bg-black object-cover" muted playsInline />
          <DialogFooter>
            <Button variant="secondary" onClick={stopCamera}>
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Online indicator for screen readers / debug — visual is in Shell top bar */}
      <span className="sr-only">{online ? t("online") : t("offline")}</span>
      {can("PRODUCTS_CREATE") && query.trim().length > 6 && !findByCode(query.trim()) ? (
        <div className="fixed bottom-20 left-4 z-20 lg:bottom-4">
          <Link
            href={`/products/new?barcode=${encodeURIComponent(query.trim())}`}
            className="rounded-lg bg-surface px-3 py-2 text-xs font-medium text-primary shadow border border-border"
          >
            {t("createWithBarcode")}
          </Link>
        </div>
      ) : null}
    </div>
  );
};
