const DISMISS_KEY = "edimart.pwaInstall.dismissedAt";
const DISMISS_DAYS = 14;

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PromptListener = (event: BeforeInstallPromptEvent | null) => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<PromptListener>();
let listening = false;

const notifyPromptListeners = () => {
  promptListeners.forEach((fn) => fn(deferredPrompt));
};

/** Capture beforeinstallprompt as early as possible (it fires once). */
export const ensureInstallPromptListener = (): void => {
  if (typeof window === "undefined" || listening) return;
  listening = true;

  window.addEventListener("beforeinstallprompt", ((e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyPromptListeners();
  }) as EventListener);

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifyPromptListeners();
  });
};

export const getDeferredInstallPrompt = (): BeforeInstallPromptEvent | null =>
  deferredPrompt;

export const clearDeferredInstallPrompt = (): void => {
  deferredPrompt = null;
  notifyPromptListeners();
};

export const subscribeInstallPrompt = (listener: PromptListener): (() => void) => {
  ensureInstallPromptListener();
  promptListeners.add(listener);
  listener(deferredPrompt);
  return () => {
    promptListeners.delete(listener);
  };
};

export const isIosDevice = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports as MacIntel with touch
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
};

export const isStandaloneDisplay = (): boolean => {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(media || iosStandalone);
};

export const isInstallDismissed = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

export const dismissInstallPrompt = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
};

export const clearInstallDismiss = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
};
