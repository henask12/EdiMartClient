"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, Lock, Printer, RefreshCw } from "lucide-react";
import { ManagerApprovalDialog, type ApprovalAction } from "@/components/ManagerApprovalDialog";
import { DenominationCounter } from "@/components/shifts/DenominationCounter";
import { ShiftReportPrint } from "@/components/shifts/ShiftReportPrint";
import { usePermission } from "@/components/PermissionProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { formatDate } from "@/lib/date-helpers";
import { formatMoney } from "@/lib/format-money";
import { parsePosSettings } from "@/lib/pos-settings";
import {
  DEFAULT_REGISTER_CODE,
  getStoredRegisterId,
  setStoredRegister,
} from "@/lib/register-device";
import {
  closeShift,
  DEFAULT_DENOMS,
  denomsPayload,
  emptyDenomCounts,
  fetchCurrentShift,
  fetchRegisters,
  fetchShift,
  fetchShiftReport,
  fetchShifts,
  openerName,
  openShift,
  parseShiftSettings,
  postCashMovement,
  totalFromDenoms,
  type DenomCounts,
  type Register,
  type Shift,
  type ShiftReport,
} from "@/lib/shifts";
import { parseApiMessage, toastError, toastSuccess } from "@/lib/toast";
import "./shift-report-print.css";

type Filter = "OPEN" | "CLOSED" | "ALL";
type PendingApproval = {
  action: ApprovalAction;
  title?: string;
  description?: string;
  resolve: (token: string | null) => void;
};

export default function ShiftsPage() {
  const t = useTranslations("Shifts");
  const { can } = usePermission();
  const canManage = can("SHIFT_MANAGE");
  const canDrawer = can("CASH_DRAWER_OPEN");

  const [filter, setFilter] = useState<Filter>("OPEN");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [current, setCurrent] = useState<Shift | null>(null);
  const [selected, setSelected] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [denoms, setDenoms] = useState<string[]>(DEFAULT_DENOMS);

  const [openSheet, setOpenSheet] = useState(false);
  const [openRegisterId, setOpenRegisterId] = useState("");
  const [openCounts, setOpenCounts] = useState<DenomCounts>({});
  const [opening, setOpening] = useState(false);

  const [cashSheet, setCashSheet] = useState<"in" | "out" | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [cashReason, setCashReason] = useState("");
  const [cashBusy, setCashBusy] = useState(false);

  const [closeSheet, setCloseSheet] = useState(false);
  const [closeCounts, setCloseCounts] = useState<DenomCounts>({});
  const [closeReveal, setCloseReveal] = useState<{
    expectedCash?: string | null;
    countedCash?: string | null;
    variance?: string | null;
  } | null>(null);
  const [closing, setClosing] = useState(false);
  const [pendingCloseBody, setPendingCloseBody] = useState<{
    denominations: Record<string, number>;
  } | null>(null);

  const [report, setReport] = useState<ShiftReport | null>(null);
  const [reportTitle, setReportTitle] = useState("X Report");
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);

  const requestApproval = (action: ApprovalAction, title?: string, description?: string) =>
    new Promise<string | null>((resolve) => {
      setPendingApproval({ action, title, description, resolve });
    });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [regs, list, cur, settingsRes] = await Promise.all([
        fetchRegisters(),
        fetchShifts(filter === "ALL" ? undefined : filter).catch(() => [] as Shift[]),
        fetchCurrentShift(),
        fetch("/api/proxy/settings/store", { cache: "no-store" }).catch(() => null),
      ]);
      setRegisters(regs);
      setShifts(list);
      setCurrent(cur);

      let settingsJson: Record<string, unknown> | null = null;
      if (settingsRes && settingsRes.ok) {
        settingsJson = (await settingsRes.json()) as Record<string, unknown>;
        const pos = parsePosSettings(settingsJson);
        if (pos.denominations.length) setDenoms(pos.denominations);
      }
      void parseShiftSettings(settingsJson);

      const stored = getStoredRegisterId();
      const preferred =
        regs.find((r) => r.id === stored) ??
        regs.find((r) => r.code === DEFAULT_REGISTER_CODE) ??
        regs[0];
      if (preferred) {
        setOpenRegisterId((prev) => prev || preferred.id);
        if (!stored) setStoredRegister(preferred.id, preferred.code);
      }
    } catch {
      toastError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOpenCounts(emptyDenomCounts(denoms));
    setCloseCounts(emptyDenomCounts(denoms));
  }, [denoms]);

  const detail = selected ?? current;

  const handleSelect = async (id: string) => {
    try {
      const full = await fetchShift(id);
      setSelected(full);
    } catch (e) {
      toastError(e instanceof Error ? e.message : t("loadFailed"));
    }
  };

  const handleOpenShift = async () => {
    if (!openRegisterId) {
      toastError(t("pickRegister"));
      return;
    }
    setOpening(true);
    try {
      const shift = await openShift({
        registerId: openRegisterId,
        denominations: denomsPayload(openCounts),
      });
      const reg = registers.find((r) => r.id === openRegisterId);
      if (reg) setStoredRegister(reg.id, reg.code);
      toastSuccess(t("shiftOpened"));
      setOpenSheet(false);
      setOpenCounts(emptyDenomCounts(denoms));
      setSelected(shift);
      await load();
    } catch (e) {
      const err = e as Error & { data?: unknown };
      toastError(parseApiMessage(err.data, err.message || t("openFailed")));
    } finally {
      setOpening(false);
    }
  };

  const handleCashSubmit = async (approvalToken?: string) => {
    if (!detail || detail.status !== "OPEN") return;
    if (cashSheet === "in" || cashSheet === "out") {
      if (!cashAmount || Number(cashAmount) <= 0) {
        toastError(t("amountRequired"));
        return;
      }
      if (!cashReason.trim()) {
        toastError(t("reasonRequired"));
        return;
      }
    }
    setCashBusy(true);
    try {
      const type = cashSheet === "in" ? "cash-in" : cashSheet === "out" ? "cash-out" : "no-sale";
      await postCashMovement(
        detail.id,
        type as "cash-in" | "cash-out" | "no-sale",
        {
          amount: cashSheet === "in" || cashSheet === "out" ? cashAmount : undefined,
          reason: cashReason.trim() || undefined,
        },
        approvalToken,
      );
      toastSuccess(cashSheet === "in" ? t("cashInDone") : t("cashOutDone"));
      setCashSheet(null);
      setCashAmount("");
      setCashReason("");
      await handleSelect(detail.id);
      await load();
    } catch (e) {
      const err = e as Error & { code?: string; action?: string; data?: unknown; status?: number };
      const code = String(err.code ?? "");
      if (code.includes("APPROVAL") || err.status === 403) {
        const token = await requestApproval(
          "NO_SALE_DRAWER_OPEN",
          t("cashApproval"),
          t("cashApprovalHint"),
        );
        if (token) {
          await handleCashSubmit(token);
          return;
        }
      }
      toastError(parseApiMessage(err.data, err.message || t("cashFailed")));
    } finally {
      setCashBusy(false);
    }
  };

  const handleNoSale = async () => {
    if (!detail || detail.status !== "OPEN") return;
    if (canDrawer) {
      setCashBusy(true);
      try {
        await postCashMovement(detail.id, "no-sale", { reason: "No-sale drawer open" });
        toastSuccess(t("noSaleDone"));
        await handleSelect(detail.id);
        await load();
      } catch (e) {
        const err = e as Error & { data?: unknown };
        toastError(parseApiMessage(err.data, err.message || t("cashFailed")));
      } finally {
        setCashBusy(false);
      }
      return;
    }
    const token = await requestApproval(
      "NO_SALE_DRAWER_OPEN",
      t("noSaleApproval"),
      t("noSaleApprovalHint"),
    );
    if (!token) return;
    setCashBusy(true);
    try {
      await postCashMovement(detail.id, "no-sale", { reason: "No-sale drawer open" }, token);
      toastSuccess(t("noSaleDone"));
      await handleSelect(detail.id);
      await load();
    } catch (e) {
      const err = e as Error & { data?: unknown };
      toastError(parseApiMessage(err.data, err.message || t("cashFailed")));
    } finally {
      setCashBusy(false);
    }
  };

  const handleXReport = async () => {
    if (!detail) return;
    try {
      const r = await fetchShiftReport(detail.id, "x-report");
      setReport(r);
      setReportTitle(t("xReport"));
      setTimeout(() => window.print(), 50);
    } catch (e) {
      toastError(e instanceof Error ? e.message : t("reportFailed"));
    }
  };

  const handlePrintZ = async (shiftId: string) => {
    try {
      const r = await fetchShiftReport(shiftId, "z-report");
      setReport(r);
      setReportTitle(t("zReport"));
      setTimeout(() => window.print(), 50);
    } catch (e) {
      toastError(e instanceof Error ? e.message : t("reportFailed"));
    }
  };

  const runClose = async (approvalToken?: string) => {
    if (!detail) return;
    const countedCash = totalFromDenoms(closeCounts);
    const body = { denominations: denomsPayload(closeCounts) };
    setPendingCloseBody(body);
    setClosing(true);
    try {
      const result = await closeShift(detail.id, body, approvalToken);
      if (result.needsApproval) {
        // API keeps expected blind until close succeeds; only variance magnitude is returned.
        setCloseReveal({
          expectedCash: null,
          countedCash,
          variance: result.data.variance != null ? String(result.data.variance) : null,
        });
        const token = await requestApproval(
          "SHIFT_VARIANCE_OVER_LIMIT",
          t("varianceApproval"),
          parseApiMessage(result.data, t("varianceApprovalHint")),
        );
        if (token) {
          await runClose(token);
          return;
        }
        toastError(t("varianceNeedsApproval"));
        return;
      }
      setCloseReveal({
        expectedCash: result.shift.expectedCash,
        countedCash: result.shift.countedCash,
        variance: result.shift.variance,
      });
      toastSuccess(t("closed"));
      void handlePrintZ(result.shift.id);
      await load();
      setSelected(result.shift);
    } catch (e) {
      const err = e as Error & { data?: Record<string, unknown> };
      toastError(parseApiMessage(err.data, err.message || t("closeFailed")));
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-6 print:hidden">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => void load()}
              icon={<RefreshCw className="size-4" />}
            >
              {t("refresh")}
            </Button>
            {canManage ? (
              <Button
                onClick={() => {
                  setOpenCounts(emptyDenomCounts(denoms));
                  setOpenSheet(true);
                }}
                disabled={!!current && current.status === "OPEN"}
              >
                {t("openShift")}
              </Button>
            ) : null}
          </div>
        }
      />

      {current && current.status === "OPEN" ? (
        <Card className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success">{t("statusOpen")}</Badge>
                <span className="font-semibold text-text">{current.shiftNumber}</span>
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {openerName(current)} · {formatDate(current.openedAt)} ·{" "}
                {current.register?.code ?? DEFAULT_REGISTER_CODE}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {t("openingFloat")}:{" "}
                <span className="tabular-nums font-medium text-text">
                  {formatMoney(current.openingFloat)}
                </span>
              </p>
            </div>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => { setCashAmount(""); setCashReason(""); setCashSheet("in"); }}>
                  {t("cashIn")}
                </Button>
                <Button variant="secondary" onClick={() => { setCashAmount(""); setCashReason(""); setCashSheet("out"); }}>
                  {t("cashOut")}
                </Button>
                <Button variant="secondary" onClick={() => void handleNoSale()} disabled={cashBusy}>
                  {t("noSale")}
                </Button>
                <Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => void handleXReport()}>
                  {t("xReport")}
                </Button>
                <Button
                  variant="danger"
                  icon={<Lock className="size-4" />}
                  onClick={() => {
                    setCloseCounts(emptyDenomCounts(denoms));
                    setCloseReveal(null);
                    setPendingCloseBody(null);
                    setCloseSheet(true);
                  }}
                >
                  {t("closeShift")}
                </Button>
              </div>
            ) : null}
          </div>

          {current.cashMovements && current.cashMovements.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-muted text-left text-text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("type")}</th>
                    <th className="px-3 py-2 font-medium">{t("amount")}</th>
                    <th className="px-3 py-2 font-medium">{t("reason")}</th>
                    <th className="px-3 py-2 font-medium">{t("when")}</th>
                  </tr>
                </thead>
                <tbody>
                  {current.cashMovements.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="px-3 py-2">{m.type}</td>
                      <td className="px-3 py-2 tabular-nums">{formatMoney(m.amount)}</td>
                      <td className="px-3 py-2 text-text-muted">{m.reason ?? "—"}</td>
                      <td className="px-3 py-2 text-text-muted">{formatDate(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      ) : (
        <Card className="p-4 sm:p-6">
          <EmptyState
            icon={<Banknote className="size-8" />}
            title={t("noOpenShift")}
            description={t("noOpenShiftHint")}
            action={
              canManage ? (
                <Button onClick={() => setOpenSheet(true)}>{t("openShift")}</Button>
              ) : undefined
            }
          />
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label={t("filter")}
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          containerClassName="w-40"
        >
          <option value="OPEN">{t("statusOpen")}</option>
          <option value="CLOSED">{t("statusClosed")}</option>
          <option value="ALL">{t("statusAll")}</option>
        </Select>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-6 text-sm text-text-muted">{t("loading")}</p>
        ) : shifts.length === 0 ? (
          <p className="p-6 text-sm text-text-muted">{t("emptyList")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-muted text-left text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("shiftNumber")}</th>
                  <th className="px-4 py-3 font-medium">{t("register")}</th>
                  <th className="px-4 py-3 font-medium">{t("cashier")}</th>
                  <th className="px-4 py-3 font-medium">{t("openedAt")}</th>
                  <th className="px-4 py-3 font-medium">{t("status")}</th>
                  <th className="px-4 py-3 font-medium">{t("variance")}</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer border-t border-border hover:bg-surface-muted/50"
                    onClick={() => void handleSelect(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void handleSelect(s.id);
                      }
                    }}
                    tabIndex={0}
                    aria-label={s.shiftNumber}
                  >
                    <td className="px-4 py-3 font-medium text-text">{s.shiftNumber}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {s.register?.code ?? s.registerId}
                    </td>
                    <td className="px-4 py-3">{openerName(s)}</td>
                    <td className="px-4 py-3 text-text-muted">{formatDate(s.openedAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === "OPEN" ? "success" : "neutral"}>
                        {s.status === "OPEN" ? t("statusOpen") : t("statusClosed")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {s.variance != null ? formatMoney(s.variance) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && selected.id !== current?.id ? (
        <Card className="space-y-3 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-text">{selected.shiftNumber}</h2>
              <p className="text-sm text-text-muted">
                {openerName(selected)} · {formatDate(selected.openedAt)}
                {selected.closedAt ? ` → ${formatDate(selected.closedAt)}` : ""}
              </p>
            </div>
            {selected.status === "CLOSED" ? (
              <Button
                variant="secondary"
                icon={<Printer className="size-4" />}
                onClick={() => void handlePrintZ(selected.id)}
              >
                {t("zReport")}
              </Button>
            ) : null}
          </div>
          {selected.expectedCash != null ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-surface-muted p-3">
                <p className="text-xs text-text-muted">{t("expected")}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatMoney(selected.expectedCash)}
                </p>
              </div>
              <div className="rounded-xl bg-surface-muted p-3">
                <p className="text-xs text-text-muted">{t("counted")}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatMoney(selected.countedCash)}
                </p>
              </div>
              <div className="rounded-xl bg-surface-muted p-3">
                <p className="text-xs text-text-muted">{t("variance")}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatMoney(selected.variance)}
                </p>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* Open shift */}
      <Sheet open={openSheet} onOpenChange={setOpenSheet}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("openShift")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 px-6 pb-6">
            <Select
              label={t("register")}
              value={openRegisterId}
              onChange={(e) => setOpenRegisterId(e.target.value)}
            >
              {registers.length === 0 ? (
                <option value="">{DEFAULT_REGISTER_CODE}</option>
              ) : (
                registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.name}
                  </option>
                ))
              )}
            </Select>
            <p className="text-sm text-text-muted">{t("openFloatHint")}</p>
            <DenominationCounter
              denominations={denoms}
              counts={openCounts}
              onChange={setOpenCounts}
              disabled={opening}
              totalLabel={t("openingFloat")}
            />
            <Button fullWidth onClick={() => void handleOpenShift()} disabled={opening || !canManage}>
              {opening ? t("opening") : t("openShift")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cash in / out */}
      <Sheet open={!!cashSheet} onOpenChange={(o) => !o && setCashSheet(null)}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{cashSheet === "in" ? t("cashIn") : t("cashOut")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 px-6 pb-6">
            <Input
              label={t("amount")}
              inputMode="decimal"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
            />
            <Input
              label={t("reason")}
              value={cashReason}
              onChange={(e) => setCashReason(e.target.value)}
            />
            <Button fullWidth onClick={() => void handleCashSubmit()} disabled={cashBusy}>
              {cashBusy ? t("saving") : t("submit")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Close shift — blind count */}
      <Sheet open={closeSheet} onOpenChange={setCloseSheet}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("closeShift")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 px-6 pb-6">
            <p className="text-sm text-text-muted">{t("blindCountHint")}</p>
            <DenominationCounter
              denominations={denoms}
              counts={closeCounts}
              onChange={setCloseCounts}
              disabled={closing}
            />
            {closeReveal ? (
              <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-3">
                <div className="flex justify-between text-sm">
                  <span>{t("expected")}</span>
                  <span className="tabular-nums font-semibold">
                    {closeReveal.expectedCash != null
                      ? formatMoney(closeReveal.expectedCash)
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("counted")}</span>
                  <span className="tabular-nums font-semibold">
                    {formatMoney(closeReveal.countedCash)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("variance")}</span>
                  <span className="tabular-nums font-semibold">
                    {closeReveal.variance != null ? formatMoney(closeReveal.variance) : "—"}
                  </span>
                </div>
              </div>
            ) : null}
            <Button
              fullWidth
              variant="danger"
              onClick={() => void runClose(undefined)}
              disabled={closing}
            >
              {closing ? t("closing") : closeReveal ? t("retryClose") : t("submitCount")}
            </Button>
            {pendingCloseBody && closeReveal ? (
              <Button
                fullWidth
                variant="secondary"
                onClick={() => {
                  setCloseSheet(false);
                  void load();
                }}
              >
                {t("done")}
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <ManagerApprovalDialog
        open={!!pendingApproval}
        action={pendingApproval?.action ?? "NO_SALE_DRAWER_OPEN"}
        title={pendingApproval?.title}
        description={pendingApproval?.description}
        onApproved={(token) => {
          pendingApproval?.resolve(token);
          setPendingApproval(null);
        }}
        onCancel={() => {
          pendingApproval?.resolve(null);
          setPendingApproval(null);
        }}
      />

      <ShiftReportPrint report={report} title={reportTitle} />
    </div>
  );
}
