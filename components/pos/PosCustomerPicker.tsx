"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import {
  createCustomer,
  creditAvailable,
  listCustomers,
  type Customer,
} from "@/lib/customers";
import { formatMoney } from "@/lib/format-money";
import { compareMoney } from "@/lib/pos-money";
import { toastError, toastSuccess } from "@/lib/toast";

type Props = {
  open: boolean;
  selected: Customer | null;
  canManage: boolean;
  onClose: () => void;
  onSelect: (customer: Customer | null) => void;
};

export const PosCustomerPicker = ({
  open,
  selected,
  canManage,
  onClose,
  onSelect,
}: Props) => {
  const t = useTranslations("Pos");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setResults([]);
    setQuickName("");
    setQuickPhone("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          setResults(await listCustomers(q.trim() || undefined));
        } catch (e) {
          toastError(e instanceof Error ? e.message : t("customerSearchFailed"));
          setResults([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [q, open, t]);

  const handleQuickCreate = async () => {
    if (!quickName.trim() || !quickPhone.trim()) {
      toastError(t("customerNamePhoneRequired"));
      return;
    }
    setCreating(true);
    try {
      const customer = await createCustomer({
        name: quickName.trim(),
        phone: quickPhone.trim(),
      });
      toastSuccess(t("customerCreated"));
      onSelect(customer);
      onClose();
    } catch (e) {
      toastError(e instanceof Error ? e.message : t("customerCreateFailed"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("pickCustomer")}</DialogTitle>
        </DialogHeader>

        {selected ? (
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm">
            <span>
              {selected.name} · {selected.phone}
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => onSelect(null)}
              aria-label={t("clearCustomer")}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : null}

        <Input
          label={t("searchCustomer")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchCustomerHint")}
          autoFocus
        />

        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {loading ? (
            <li className="py-4 text-center text-sm text-text-muted">{t("searching")}</li>
          ) : results.length === 0 ? (
            <li className="py-4 text-center text-sm text-text-muted">{t("noCustomersFound")}</li>
          ) : (
            results.map((c) => {
              const available = creditAvailable(c);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(c);
                      onClose();
                    }}
                    className="flex w-full flex-col rounded-xl border border-border px-3 py-2.5 text-left hover:bg-surface-muted focus-ring"
                  >
                    <span className="font-medium text-text">{c.name}</span>
                    <span className="text-xs tabular-nums text-text-muted">{c.phone}</span>
                    <span className="mt-1 text-xs text-text-muted">
                      {t("storeCredit")}: {formatMoney(c.storeCreditBalance)}
                      {" · "}
                      {t("points")}: {c.loyaltyPoints ?? 0}
                      {compareMoney(available, "0") > 0
                        ? ` · ${t("creditAvailable")}: ${formatMoney(available)}`
                        : ""}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {canManage ? (
          <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
            <p className="text-sm font-medium text-text">{t("quickCreateCustomer")}</p>
            <Input
              label={t("customerName")}
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
            />
            <Input
              label={t("customerPhone")}
              value={quickPhone}
              onChange={(e) => setQuickPhone(e.target.value)}
              placeholder="09…"
            />
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={creating}
              onClick={() => void handleQuickCreate()}
            >
              {creating ? t("creating") : t("createAndSelect")}
            </Button>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type ChipProps = {
  customer: Customer | null;
  onOpen: () => void;
  onClear: () => void;
};

export const PosCustomerChip = ({ customer, onOpen, onClear }: ChipProps) => {
  const t = useTranslations("Pos");
  if (!customer) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm text-text-muted hover:bg-surface-muted focus-ring"
        aria-label={`${t("pickCustomer")} (F3)`}
      >
        <UserRound className="size-4" />
        <span>{t("walkIn")}</span>
        <kbd className="ml-1 hidden rounded border border-border px-1 text-[10px] sm:inline">
          F3
        </kbd>
      </button>
    );
  }

  const available = creditAvailable(customer);
  return (
    <div className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 rounded-lg border border-primary/30 bg-primary-soft px-2.5 py-1.5 text-left text-sm text-primary focus-ring"
        aria-label={t("pickCustomer")}
      >
        <span className="block truncate font-semibold">{customer.name}</span>
        <span className="block truncate text-[11px] opacity-80">
          {formatMoney(customer.storeCreditBalance)} credit · {customer.loyaltyPoints ?? 0} pts
          {compareMoney(available, "0") > 0 ? ` · ${formatMoney(available)} avail` : ""}
        </span>
      </button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={onClear}
        aria-label={t("clearCustomer")}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
};
