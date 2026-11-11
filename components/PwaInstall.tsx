"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import {
  clearDeferredInstallPrompt,
  dismissInstallPrompt,
  ensureInstallPromptListener,
  isInstallDismissed,
  isIosDevice,
  isStandaloneDisplay,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";

type Mode = "button" | "banner" | "card";

type Props = {
  mode?: Mode;
  className?: string;
  /** When true, show even if previously dismissed (e.g. Settings). */
  force?: boolean;
};

export const PwaInstall = ({ mode = "button", className, force = false }: Props) => {
  const t = useTranslations("Pwa");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureInstallPromptListener();
    setStandalone(isStandaloneDisplay());
    setIos(isIosDevice());
    setDismissed(isInstallDismissed());
    setReady(true);

    const unsub = subscribeInstallPrompt((event) => {
      setPromptEvent(event);
      if (!event && isStandaloneDisplay()) setStandalone(true);
    });

    const onDisplayChange = () => setStandalone(isStandaloneDisplay());
    const media = window.matchMedia?.("(display-mode: standalone)");
    media?.addEventListener?.("change", onDisplayChange);

    return () => {
      unsub();
      media?.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  const canNativeInstall = Boolean(promptEvent);
  const showChromeInstall = canNativeInstall && !standalone;
  const showIosGuide = ios && !standalone;
  const relevant = showChromeInstall || showIosGuide;

  const handleDismiss = useCallback(() => {
    dismissInstallPrompt();
    setDismissed(true);
    setOpen(false);
  }, []);

  const handleNativeInstall = async () => {
    if (!promptEvent) {
      setOpen(true);
      return;
    }
    setInstalling(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      clearDeferredInstallPrompt();
      setOpen(false);
    } catch {
      setOpen(true);
    } finally {
      setInstalling(false);
    }
  };

  const handleOpen = () => {
    if (canNativeInstall && !ios) {
      void handleNativeInstall();
      return;
    }
    setOpen(true);
  };

  if (!ready || standalone) return null;
  if (!relevant && !force) return null;
  if (mode === "banner" && dismissed && !force) return null;

  const guideBody: ReactNode = (
    <div className="space-y-4 text-sm text-text">
      <p className="text-text-muted">{t("description")}</p>

      {showChromeInstall ? (
        <Button
          type="button"
          size="pos"
          fullWidth
          disabled={installing}
          onClick={() => void handleNativeInstall()}
        >
          <Download className="size-4" />
          {installing ? t("installing") : t("install")}
        </Button>
      ) : null}

      {showIosGuide ? (
        <ol className="space-y-3 rounded-xl border border-border bg-surface-muted p-4">
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg">
              1
            </span>
            <span>{t("iosStepSafari")}</span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg">
              2
            </span>
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {t.rich("iosStepShare", {
                icon: () => (
                  <Share className="inline size-4 shrink-0 text-primary" aria-hidden />
                ),
              })}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg">
              3
            </span>
            <span>{t("iosStepAdd")}</span>
          </li>
        </ol>
      ) : null}

      {!showChromeInstall && !showIosGuide ? (
        <p className="rounded-xl border border-border bg-surface-muted p-4 text-text-muted">
          {t("manualHint")}
        </p>
      ) : null}
    </div>
  );

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5 text-primary" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>
        {guideBody}
        <DialogFooter className="gap-2 sm:justify-between">
          {!force ? (
            <Button type="button" variant="ghost" onClick={handleDismiss}>
              {t("notNow")}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {t("gotIt")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (mode === "banner") {
    return (
      <>
        <div
          className={cn(
            "flex items-center gap-3 border-b border-border bg-primary-soft px-3 py-2.5 text-sm text-text",
            className,
          )}
          role="region"
          aria-label={t("title")}
        >
          <Smartphone className="size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-text">{t("bannerTitle")}</p>
            <p className="text-xs text-text-muted">{t("bannerHint")}</p>
          </div>
          <Button type="button" size="sm" onClick={handleOpen} className="shrink-0">
            {ios ? t("howTo") : t("install")}
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-text focus-ring"
            aria-label={t("dismiss")}
          >
            <X className="size-4" />
          </button>
        </div>
        {dialog}
      </>
    );
  }

  if (mode === "card") {
    return (
      <>
        <div
          className={cn(
            "space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-6",
            className,
          )}
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Smartphone className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-base font-semibold text-text">{t("title")}</h2>
              <p className="text-sm text-text-muted">{t("description")}</p>
            </div>
          </div>
          <Button type="button" size="pos" fullWidth onClick={handleOpen}>
            <Download className="size-4" />
            {ios ? t("addToHomeIos") : t("install")}
          </Button>
          {ios ? <p className="text-xs text-text-muted">{t("iosShortHint")}</p> : null}
        </div>
        {dialog}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-surface-muted hover:text-text focus-ring",
          className,
        )}
        aria-label={t("install")}
        title={t("install")}
      >
        <Download className="size-4" />
      </button>
      {dialog}
    </>
  );
};
