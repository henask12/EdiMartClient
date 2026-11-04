"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { parseApiMessage, toastError } from "@/lib/toast";

export type ApprovalAction =
  | "DISCOUNT_OVER_LIMIT"
  | "PRICE_OVERRIDE"
  | "SALE_VOID"
  | "REFUND_OUTSIDE_WINDOW"
  | "STOCK_ADJUST_OVER_LIMIT"
  | "NO_SALE_DRAWER_OPEN";

type Manager = {
  id: string;
  displayName: string | null;
  email: string;
};

type Props = {
  open: boolean;
  action: ApprovalAction;
  title?: string;
  description?: string;
  onApproved: (token: string) => void;
  onCancel: () => void;
};

export const ManagerApprovalDialog = ({
  open,
  action,
  title,
  description,
  onApproved,
  onCancel,
}: Props) => {
  const t = useTranslations("Pos");
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managerId, setManagerId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);

  useEffect(() => {
    if (!open) {
      setPin("");
      setManagerId("");
      return;
    }
    let cancelled = false;
    setLoadingManagers(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/proxy/approvals/managers?action=${encodeURIComponent(action)}`,
          { cache: "no-store" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toastError(parseApiMessage(data, t("approvalLoadFailed")));
          return;
        }
        const list = (Array.isArray(data) ? data : data.items ?? []) as Manager[];
        if (!cancelled) {
          setManagers(list);
          if (list.length === 1) setManagerId(list[0].id);
        }
      } catch {
        toastError(t("approvalLoadFailed"));
      } finally {
        if (!cancelled) setLoadingManagers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, action, t]);

  const handleSubmit = async () => {
    if (!managerId || !/^\d{4,6}$/.test(pin)) {
      toastError(t("approvalPinInvalid"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/proxy/approvals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ managerId, pin, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(parseApiMessage(data, t("approvalFailed")));
        return;
      }
      const token = (data.token ?? data.approvalToken) as string | undefined;
      if (!token) {
        toastError(t("approvalFailed"));
        return;
      }
      onApproved(token);
      setPin("");
    } catch {
      toastError(t("approvalFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? t("managerApproval")}</DialogTitle>
          <DialogDescription>
            {description ?? t("managerApprovalHint")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Select
            label={t("approvingManager")}
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            disabled={loadingManagers || loading}
          >
            <option value="">
              {loadingManagers ? t("loadingManagers") : t("selectManager")}
            </option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName ?? m.email}
              </option>
            ))}
          </Select>
          <Input
            label={t("managerPin")}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            disabled={loading}
            aria-label={t("managerPin")}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={loading || !managerId}>
            {loading ? t("approving") : t("approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
